"""Document upload and listing endpoints."""

import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List
from uuid import UUID, uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.config import settings
from app.db.database import get_db
from app.db.models import DocumentStatus, Job, JobStatus, RfpDocument, User, Workspace
from app.db.repository import DbSession
from app.logger import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger("upload_api")
router = APIRouter(prefix="/api/workspaces", tags=["upload"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    document_id: UUID
    job_id: UUID
    filename: str
    status: str


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    s3_key: str
    status: DocumentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/{workspace_id}/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    workspace_id: UUID,
    file: UploadFile = File(...),
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
) -> UploadResponse:
    """Upload an RFP document (PDF or DOCX) and queue extraction.

    Returns a job_id for tracking progress.
    """
    workspace = await _check_workspace(workspace_id, current_user, session)

    # Validate file type
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read file content with size check
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50MB limit")

    # Store file (local or S3)
    safe_filename = f"{uuid4().hex}{ext}"
    s3_key = f"orgs/{current_user.org_id}/workspaces/{workspace_id}/{safe_filename}"

    if settings.USE_LOCAL_STORAGE:
        storage_path = Path(settings.LOCAL_STORAGE_PATH) / str(current_user.org_id) / str(workspace_id)
        storage_path.mkdir(parents=True, exist_ok=True)
        file_path = storage_path / safe_filename
        with open(file_path, "wb") as f:
            f.write(content)
        logger.debug("File saved locally", path=str(file_path))
    else:
        try:
            s3 = boto3.client(
                "s3",
                region_name=settings.S3_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
            logger.debug("File uploaded to S3", key=s3_key)
        except (BotoCoreError, ClientError) as exc:
            logger.error("S3 upload failed", error=str(exc))
            raise HTTPException(status_code=500, detail="File storage failed")

    # Create document record
    from app.db.repository import db_create
    doc = RfpDocument(
        workspace_id=workspace_id,
        filename=file.filename or safe_filename,
        s3_key=s3_key,
        status=DocumentStatus.PENDING,
    )
    doc = await db_create(session, doc)

    # Create job record
    job = Job(
        workspace_id=workspace_id,
        job_type="extract",
        status=JobStatus.PENDING,
        progress_pct=0,
    )
    job = await db_create(session, job)

    # Queue Celery task
    task = celery_app.send_task(
        "tasks.extract.extract_rfp_text",
        args=[str(job.id), str(doc.id)],
        task_id=str(job.id),
    )
    # Update job with task ID
    from app.db.repository import db_update
    job = await db_update(session, Job, job.id, {"task_id": task.id})

    logger.info(
        "Document uploaded, extraction queued",
        document_id=str(doc.id),
        job_id=str(job.id),
        filename=file.filename,
    )

    return UploadResponse(
        document_id=doc.id,
        job_id=job.id,
        filename=doc.filename,
        status="queued",
    )


@router.get("/{workspace_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    workspace_id: UUID,
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
) -> List[DocumentResponse]:
    """List all documents for a workspace."""
    await _check_workspace(workspace_id, current_user, session)

    from app.db.repository import db_query
    docs = await db_query(
        session,
        RfpDocument,
        filters=[("workspace_id", "==", workspace_id)],
        order_by=("created_at", "desc"),
    )
    return [DocumentResponse.model_validate(d) for d in docs]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _check_workspace(
    workspace_id: UUID,
    user: User,
    session: DbSession,
) -> Workspace:
    from app.db.repository import db_get_by_id
    workspace = await db_get_by_id(session, Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace
