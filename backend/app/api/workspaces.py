from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import RfpDocument, User, Workspace, WorkspaceStatus
from app.logger import get_logger

logger = get_logger("workspaces_api")
router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceCreate(BaseModel):
    name: str
    sector: Optional[str] = None
    deadline: Optional[datetime] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[WorkspaceStatus] = None


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    org_id: UUID
    sector: Optional[str]
    deadline: Optional[datetime]
    status: WorkspaceStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceDetailResponse(WorkspaceResponse):
    rfp_documents: List[dict] = []


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Workspace)
        .where(Workspace.org_id == current_user.org_id, Workspace.deleted_at.is_(None))
        .order_by(Workspace.created_at.desc())
    )
    return [WorkspaceResponse.model_validate(w) for w in result.scalars().all()]


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    payload: WorkspaceCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    workspace = Workspace(
        name=payload.name,
        org_id=current_user.org_id,
        sector=payload.sector,
        deadline=payload.deadline,
    )
    session.add(workspace)
    await session.flush()
    await session.refresh(workspace)
    logger.info("Workspace created", id=str(workspace.id), name=workspace.name)
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    workspace = await _get_workspace(workspace_id, current_user, session)
    docs_result = await session.execute(
        select(RfpDocument).where(RfpDocument.workspace_id == workspace_id)
    )
    docs = docs_result.scalars().all()

    response = WorkspaceDetailResponse.model_validate(workspace)
    response.rfp_documents = [
        {"id": str(d.id), "filename": d.filename, "status": d.status.value, "created_at": d.created_at.isoformat()}
        for d in docs
    ]
    return response


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    payload: WorkspaceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    workspace = await _get_workspace(workspace_id, current_user, session)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(workspace, field, value)
    workspace.updated_at = datetime.utcnow()
    session.add(workspace)
    await session.flush()
    await session.refresh(workspace)
    return WorkspaceResponse.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    workspace = await _get_workspace(workspace_id, current_user, session)
    workspace.deleted_at = datetime.utcnow()
    session.add(workspace)


async def _get_workspace(workspace_id: UUID, user: User, session: AsyncSession) -> Workspace:
    workspace = await session.get(Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace
