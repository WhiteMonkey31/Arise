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
    from app.db.database import async_session_factory
    from app.db.models import ComplianceStatus, Job, Requirement, Workspace
    from app.rag.matcher import rag_matcher
    from sqlmodel import select

    async with async_session_factory() as session:
        job = await session.get(Job, UUID(job_id))
        workspace = await session.get(Workspace, UUID(workspace_id))

        if not job or not workspace:
            return {"status": "failed", "error": "Job or workspace not found"}

        try:
            job.status = JobStatus.PROCESSING
            job.progress_pct = 5
            session.add(job)
            await session.commit()

            result = await session.execute(
                select(Requirement).where(Requirement.workspace_id == UUID(workspace_id))
            )
            requirements = result.scalars().all()

            if not requirements:
                job.status = JobStatus.DONE
                job.progress_pct = 100
                session.add(job)
                await session.commit()
                return {"status": "done", "n_matched": 0}

            n_matched = 0
            for idx, req in enumerate(requirements):
                try:
                    matches = await rag_matcher.match(req.text, org_id=str(workspace.org_id))

                    existing_result = await session.execute(
                        select(ComplianceItem).where(
                            ComplianceItem.workspace_id == UUID(workspace_id),
                            ComplianceItem.requirement_id == req.id,
                        )
                    )
                    existing = existing_result.scalars().first()

                    if matches:
                        best = matches[0]
                        if existing:
                            existing.capability_id = UUID(best.capability_id)
                            existing.match_score = best.score
                            existing.status = best.status
                            session.add(existing)
                        else:
                            session.add(ComplianceItem(
                                workspace_id=UUID(workspace_id),
                                requirement_id=req.id,
                                capability_id=UUID(best.capability_id),
                                match_score=best.score,
                                status=best.status,
                            ))
                    elif not existing:
                        session.add(ComplianceItem(
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
                job.progress_pct = progress
                session.add(job)
                await session.commit()
                task.update_state(state="STARTED", meta={"progress": progress})

            job.status = JobStatus.DONE
            job.progress_pct = 100
            session.add(job)
            await session.commit()
            return {"status": "done", "n_matched": n_matched}

        except Exception as exc:
            logger.error("Match task failed", error=str(exc))
            job.status = JobStatus.FAILED
            job.error_msg = str(exc)
            session.add(job)
            await session.commit()
            try:
                raise task.retry(exc=exc)
            except Exception:
                return {"status": "failed", "error": str(exc)}
