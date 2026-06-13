import asyncio
from uuid import UUID

from app.db.models import ComplianceItem, JobStatus
from app.logger import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger("task_match")


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="tasks.match.match_capabilities", bind=True, max_retries=3, default_retry_delay=30)
def match_capabilities(self, job_id: str, workspace_id: str) -> dict:
    return _run_async(_run(self, job_id, workspace_id))


async def _run(task, job_id: str, workspace_id: str) -> dict:
    from app.db.database import get_db_session
    from app.db.models import ComplianceStatus, Job, Requirement, Workspace
    from app.db.repository import db_get_by_id, db_query, db_update
    from app.rag.matcher import rag_matcher

    async with get_db_session() as session:
        job = await db_get_by_id(session, Job, UUID(job_id))
        workspace = await db_get_by_id(session, Workspace, UUID(workspace_id))

        if not job or not workspace:
            return {"status": "failed", "error": "Job or workspace not found"}

        try:
            await db_update(session, Job, job.id, {"status": JobStatus.PROCESSING, "progress_pct": 5})

            requirements = await db_query(
                session,
                Requirement,
                filters=[("workspace_id", "==", workspace_id)],
            )

            if not requirements:
                await db_update(session, Job, job.id, {"status": JobStatus.DONE, "progress_pct": 100})
                return {"status": "done", "n_matched": 0}

            n_matched = 0
            for idx, req in enumerate(requirements):
                try:
                    matches = await rag_matcher.match(req.text, org_id=str(workspace.org_id))

                    existing_items = await db_query(
                        session,
                        ComplianceItem,
                        filters=[
                            ("workspace_id", "==", workspace_id),
                            ("requirement_id", "==", req.id),
                        ],
                    )
                    existing = existing_items[0] if existing_items else None

                    if matches:
                        best = matches[0]
                        if existing:
                            await db_update(
                                session,
                                ComplianceItem,
                                existing.id,
                                {
                                    "capability_id": UUID(best.capability_id),
                                    "match_score": best.score,
                                    "status": best.status,
                                },
                            )
                        else:
                            await db_query(  # Create
                                session,
                                ComplianceItem,
                                filters=[],  # Placeholder
                            )
                            # For Firebase, use direct create via repository
                            from app.db.repository import db_create
                            await db_create(session, ComplianceItem(
                                workspace_id=UUID(workspace_id),
                                requirement_id=req.id,
                                capability_id=UUID(best.capability_id),
                                match_score=best.score,
                                status=best.status,
                            ))
                    elif not existing:
                        from app.db.repository import db_create
                        await db_create(session, ComplianceItem(
                            workspace_id=UUID(workspace_id),
                            requirement_id=req.id,
                            match_score=0.0,
                            status=ComplianceStatus.GAP,
                            notes="No matching capability found",
                        ))

                    n_matched += 1
                except Exception as exc:
                    logger.warning("Match failed for requirement", req_id=str(req.id), error=str(exc))

                progress = int((idx + 1) / len(requirements) * 90)
                await db_update(session, Job, job.id, {"progress_pct": progress})
                task.update_state(state="STARTED", meta={"progress": progress})

            await db_update(session, Job, job.id, {"status": JobStatus.DONE, "progress_pct": 100})
            return {"status": "done", "n_matched": n_matched}

        except Exception as exc:
            logger.error("Match task failed", error=str(exc))
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

