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


@celery_app.task(name="tasks.draft.draft_proposals", bind=True, max_retries=2, default_retry_delay=60)
def draft_proposals(self, job_id: str, workspace_id: str) -> dict:
    """Draft individual proposal sections for all requirements (section-by-section approach)."""
    return _run_async(_draft_proposals_async(self, job_id, workspace_id))


@celery_app.task(name="tasks.draft.draft_full_document", bind=True, max_retries=2, default_retry_delay=60)
def draft_full_document(self, job_id: str, workspace_id: str, target_words_per_section: int = 400) -> dict:
    """
    Auto-draft a complete structured proposal response document.
    Generates cover page, executive summary, and all sections in one AI call chain.
    """
    return _run_async(_draft_full_document_async(self, job_id, workspace_id, target_words_per_section))


async def _draft_proposals_async(task, job_id: str, workspace_id: str) -> dict:
    from app.db.database import async_session_factory
    from app.db.models import Job, Requirement
    from app.ai.drafter import ProposalDrafter
    from app.ai.quality_scorer import QualityScorer
    from sqlmodel import select

    async with async_session_factory() as session:
        job = await session.get(Job, UUID(job_id))
        if not job:
            return {"status": "failed", "error": "Job not found"}

        try:
            job.status = JobStatus.PROCESSING
            job.progress_pct = 5
            session.add(job)
            await session.commit()

            result = await session.execute(
                select(Requirement).where(Requirement.workspace_id == UUID(workspace_id))
                .order_by(Requirement.sort_order.asc())
            )
            requirements = result.scalars().all()

            if not requirements:
                job.status = JobStatus.DONE
                job.progress_pct = 100
                session.add(job)
                await session.commit()
                return {"status": "done", "n_drafted": 0}

            drafter = ProposalDrafter()
            scorer = QualityScorer()
            n = len(requirements)
            n_drafted = 0

            for idx, req in enumerate(requirements):
                try:
                    proposal = await drafter.draft_and_save(req.id, UUID(workspace_id), session)
                    try:
                        await scorer.score_proposal(proposal.id, session)
                    except Exception as exc:
                        logger.warning("Scoring failed", proposal_id=str(proposal.id), error=str(exc))
                    n_drafted += 1
                except Exception as exc:
                    logger.warning("Draft failed", req_id=str(req.id), error=str(exc))

                progress = int((idx + 1) / n * 90)
                job.progress_pct = progress
                session.add(job)
                await session.commit()
                task.update_state(state="STARTED", meta={"progress": progress})

            job.status = JobStatus.DONE
            job.progress_pct = 100
            session.add(job)
            await session.commit()
            return {"status": "done", "n_drafted": n_drafted}

        except Exception as exc:
            logger.error("Draft task failed", error=str(exc))
            job.status = JobStatus.FAILED
            job.error_msg = str(exc)
            session.add(job)
            await session.commit()
            try:
                raise task.retry(exc=exc)
            except Exception:
                return {"status": "failed", "error": str(exc)}


async def _draft_full_document_async(task, job_id: str, workspace_id: str, target_words: int) -> dict:
    from app.db.database import async_session_factory
    from app.db.models import Job
    from app.ai.drafter import ProposalDrafter
    from app.ai.quality_scorer import QualityScorer
    from sqlmodel import select
    from app.db.models import Proposal

    async with async_session_factory() as session:
        job = await session.get(Job, UUID(job_id))
        if not job:
            return {"status": "failed", "error": "Job not found"}

        try:
            job.status = JobStatus.PROCESSING
            job.progress_pct = 5
            session.add(job)
            await session.commit()

            async def progress_cb(pct: int):
                job.progress_pct = pct
                session.add(job)
                await session.commit()
                task.update_state(state="STARTED", meta={"progress": pct})

            drafter = ProposalDrafter()
            doc = await drafter.draft_full_document(
                workspace_id=UUID(workspace_id),
                session=session,
                target_words_per_section=target_words,
                progress_callback=progress_cb,
            )

            # Auto-score all drafted proposals
            scorer = QualityScorer()
            proposal_result = await session.execute(
                select(Proposal).where(Proposal.workspace_id == UUID(workspace_id))
            )
            proposals = proposal_result.scalars().all()

            for p in proposals:
                try:
                    await scorer.score_proposal(p.id, session)
                except Exception as exc:
                    logger.warning("Scoring failed", proposal_id=str(p.id), error=str(exc))

            job.status = JobStatus.DONE
            job.progress_pct = 100
            session.add(job)
            await session.commit()

            logger.info("Full document task complete", workspace_id=workspace_id, sections=doc.total_sections)
            return {"status": "done", "sections": doc.total_sections, "total_words": doc.total_word_count}

        except Exception as exc:
            logger.error("Full document task failed", error=str(exc))
            job.status = JobStatus.FAILED
            job.error_msg = str(exc)
            session.add(job)
            await session.commit()
            try:
                raise task.retry(exc=exc)
            except Exception:
                return {"status": "failed", "error": str(exc)}
