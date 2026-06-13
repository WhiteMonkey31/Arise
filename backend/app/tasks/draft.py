"""Celery task: draft proposal sections for all requirements in a workspace."""

import asyncio
from uuid import UUID

from app.db.models import JobStatus
from app.logger import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger("task_draft")


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    name="tasks.draft.draft_proposals",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def draft_proposals(self, job_id: str, workspace_id: str) -> dict:
    """Draft proposal sections for every requirement in the workspace.

    For each requirement with a compliance item:
        1. Load matched capabilities
        2. Run Claude/OpenAI drafting
        3. Store to proposals table with version history
        4. Score quality with auto-scorer

    Args:
        job_id: UUID string of the Job record.
        workspace_id: UUID string of the Workspace.

    Returns:
        Dict with n_drafted and status.
    """
    return _run_async(_draft_proposals_async(self, job_id, workspace_id))


async def _draft_proposals_async(task, job_id: str, workspace_id: str) -> dict:
    from app.db.database import get_db_session
    from app.db.models import Job, Requirement, Workspace
    from app.db.repository import db_get_by_id, db_query, db_update
    from app.ai.drafter import ProposalDrafter
    from app.ai.quality_scorer import QualityScorer

    async with get_db_session() as session:
        job = await db_get_by_id(session, Job, UUID(job_id))
        workspace = await db_get_by_id(session, Workspace, UUID(workspace_id))

        if not job or not workspace:
            return {"status": "failed", "error": "Job or workspace not found"}

        try:
            await db_update(session, Job, job.id, {"status": JobStatus.PROCESSING, "progress_pct": 5})

            # Load requirements for workspace
            requirements = await db_query(
                session,
                Requirement,
                filters=[("workspace_id", "==", workspace_id)],
            )

            if not requirements:
                await db_update(session, Job, job.id, {"status": JobStatus.DONE, "progress_pct": 100})
                return {"status": "done", "n_drafted": 0}

            drafter = ProposalDrafter()
            scorer = QualityScorer()
            n_requirements = len(requirements)
            n_drafted = 0

            for idx, req in enumerate(requirements):
                try:
                    proposal = await drafter.draft_and_save(
                        requirement_id=req.id,
                        workspace_id=UUID(workspace_id),
                        session=session,
                    )

                    # Auto-score the draft
                    try:
                        await scorer.score_proposal(
                            proposal_id=proposal.id,
                            session=session,
                        )
                    except Exception as score_exc:
                        logger.warning(
                            "Quality scoring failed",
                            proposal_id=str(proposal.id),
                            error=str(score_exc),
                        )

                    n_drafted += 1

                except Exception as exc:
                    logger.warning(
                        "Draft failed for requirement",
                        req_id=str(req.id),
                        error=str(exc),
                    )

                # Update progress
                progress = int((idx + 1) / n_requirements * 90)
                await db_update(session, Job, job.id, {"progress_pct": progress})
                task.update_state(state="STARTED", meta={"progress": progress})

            # Mark done
            await db_update(session, Job, job.id, {"status": JobStatus.DONE, "progress_pct": 100})

            logger.info(
                "Draft task complete",
                workspace_id=workspace_id,
                n_drafted=n_drafted,
            )
            return {"status": "done", "n_drafted": n_drafted}

        except Exception as exc:
            logger.error("Draft task failed", error=str(exc), job_id=job_id)
            await db_update(
                session,
                Job,
                job.id,
                {"status": JobStatus.FAILED, "error_msg": str(exc)},
            )
            try:
                raise task.retry(exc=exc)
            except Exception:
                return {"status": "failed", "error": str(exc)}
