from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.users import current_active_user
from app.db.database import get_db
from app.db.models import RfpDocument, User, Workspace, WorkspaceStatus
from app.db.repository import DbSession, db_create, db_get_by_id, db_query, db_update
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
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
):
    workspaces = await db_query(
        session,
        Workspace,
        filters=[("org_id", "==", current_user.org_id), ("deleted_at", "==", None)],
        order_by=("created_at", "desc"),
    )
    return [WorkspaceResponse.model_validate(w) for w in workspaces]


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    payload: WorkspaceCreate,
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
):
    workspace = Workspace(
        name=payload.name,
        org_id=current_user.org_id,
        sector=payload.sector,
        deadline=payload.deadline,
    )
    workspace = await db_create(session, workspace)
    logger.info("Workspace created", id=str(workspace.id if not isinstance(workspace, dict) else workspace["id"]), name=workspace.name if not isinstance(workspace, dict) else workspace["name"])
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: UUID,
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
):
    workspace = await _get_workspace(workspace_id, current_user, session)
    docs = await db_query(
        session,
        RfpDocument,
        filters=[("workspace_id", "==", workspace_id)],
    )

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
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
):
    await _get_workspace(workspace_id, current_user, session)
    values = payload.model_dump(exclude_unset=True)
    workspace = await db_update(session, Workspace, workspace_id, values)
    return WorkspaceResponse.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: UUID,
    session: DbSession = Depends(get_db),
    current_user: User = Depends(current_active_user),
):
    await _get_workspace(workspace_id, current_user, session)
    await db_update(session, Workspace, workspace_id, {"deleted_at": datetime.now(timezone.utc)})


async def _get_workspace(workspace_id: UUID, user: User, session: DbSession) -> Workspace:
    workspace = await db_get_by_id(session, Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace
