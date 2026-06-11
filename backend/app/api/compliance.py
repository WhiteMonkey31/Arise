from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import Capability, ComplianceItem, ComplianceStatus, Requirement, User, Workspace
from app.logger import get_logger

logger = get_logger("compliance_api")
router = APIRouter(prefix="/api/workspaces", tags=["compliance"])


class CapabilityBrief(BaseModel):
    id: UUID
    title: str
    domain: Optional[str]
    certification: Optional[str]


class ComplianceItemResponse(BaseModel):
    id: UUID
    requirement_id: UUID
    requirement_text: str
    requirement_category: Optional[str]
    capability_id: Optional[UUID]
    capability: Optional[CapabilityBrief]
    match_score: Optional[float]
    status: ComplianceStatus
    notes: Optional[str]
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplianceSummary(BaseModel):
    total: int
    pass_count: int
    partial_count: int
    gap_count: int
    compliance_pct: float
    items: List[ComplianceItemResponse]


class ComplianceItemUpdate(BaseModel):
    status: Optional[ComplianceStatus] = None
    notes: Optional[str] = None
    capability_id: Optional[UUID] = None


@router.get("/{workspace_id}/compliance", response_model=ComplianceSummary)
async def get_compliance(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    await _check_workspace(workspace_id, current_user, session)

    result = await session.execute(
        select(ComplianceItem).where(ComplianceItem.workspace_id == workspace_id)
    )
    items = result.scalars().all()

    pass_count = sum(1 for i in items if i.status == ComplianceStatus.PASS)
    partial_count = sum(1 for i in items if i.status == ComplianceStatus.PARTIAL)
    gap_count = sum(1 for i in items if i.status == ComplianceStatus.GAP)
    total = len(items)
    compliance_pct = round(((pass_count + partial_count * 0.5) / total * 100) if total > 0 else 0.0, 1)

    enriched = []
    for item in items:
        req = await session.get(Requirement, item.requirement_id)
        cap = None
        if item.capability_id:
            cap_obj = await session.get(Capability, item.capability_id)
            if cap_obj:
                cap = CapabilityBrief(id=cap_obj.id, title=cap_obj.title, domain=cap_obj.domain, certification=cap_obj.certification)

        enriched.append(ComplianceItemResponse(
            id=item.id,
            requirement_id=item.requirement_id,
            requirement_text=req.text if req else "",
            requirement_category=req.category if req else None,
            capability_id=item.capability_id,
            capability=cap,
            match_score=item.match_score,
            status=item.status,
            notes=item.notes,
            updated_at=item.updated_at,
        ))

    return ComplianceSummary(total=total, pass_count=pass_count, partial_count=partial_count, gap_count=gap_count, compliance_pct=compliance_pct, items=enriched)


@router.patch("/{workspace_id}/compliance/{item_id}", response_model=ComplianceItemResponse)
async def update_compliance_item(
    workspace_id: UUID,
    item_id: UUID,
    payload: ComplianceItemUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    await _check_workspace(workspace_id, current_user, session)

    item = await session.get(ComplianceItem, item_id)
    if not item or item.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Compliance item not found")

    if payload.status is not None:
        item.status = payload.status
    if payload.notes is not None:
        item.notes = payload.notes
    if payload.capability_id is not None:
        item.capability_id = payload.capability_id
    item.updated_at = datetime.utcnow()

    session.add(item)
    await session.flush()

    req = await session.get(Requirement, item.requirement_id)
    cap = None
    if item.capability_id:
        cap_obj = await session.get(Capability, item.capability_id)
        if cap_obj:
            cap = CapabilityBrief(id=cap_obj.id, title=cap_obj.title, domain=cap_obj.domain, certification=cap_obj.certification)

    logger.info("Compliance item updated", item_id=str(item_id), status=item.status)
    return ComplianceItemResponse(
        id=item.id, requirement_id=item.requirement_id,
        requirement_text=req.text if req else "", requirement_category=req.category if req else None,
        capability_id=item.capability_id, capability=cap,
        match_score=item.match_score, status=item.status, notes=item.notes, updated_at=item.updated_at,
    )


async def _check_workspace(workspace_id: UUID, user: User, session: AsyncSession) -> Workspace:
    workspace = await session.get(Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace
