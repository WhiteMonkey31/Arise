"""Job status polling endpoint."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import Job, JobStatus, User
from app.logger import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger("jobs_api")
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class JobResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID]
    task_id: Optional[str]
    job_type: str
    status: JobStatus
    progress_pct: int
    error_msg: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> JobResponse:
    """Get the status and progress of a background job.

    Augments the DB record with live Celery task state when available.
    """
    job = await session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Optionally sync live Celery state
    if job.task_id and job.status not in (JobStatus.DONE, JobStatus.FAILED):
        try:
            celery_result = celery_app.AsyncResult(job.task_id)
            celery_state = celery_result.state

            if celery_state == "SUCCESS" and job.status != JobStatus.DONE:
                job.status = JobStatus.DONE
                job.progress_pct = 100
                job.updated_at = datetime.utcnow()
                session.add(job)
            elif celery_state == "FAILURE" and job.status != JobStatus.FAILED:
                job.status = JobStatus.FAILED
                job.error_msg = str(celery_result.result)
                job.updated_at = datetime.utcnow()
                session.add(job)
            elif celery_state == "STARTED" and job.status == JobStatus.PENDING:
                job.status = JobStatus.PROCESSING
                job.updated_at = datetime.utcnow()
                session.add(job)

            # Pull progress from task meta if available
            if isinstance(celery_result.info, dict):
                job.progress_pct = celery_result.info.get("progress", job.progress_pct)

        except Exception as exc:
            logger.warning("Could not fetch Celery task state", error=str(exc))

    logger.debug("Job status fetched", job_id=str(job_id), status=job.status)
    return JobResponse.model_validate(job)
