import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import (
    Job,
    JobStatus,
    Proposal,
    ProposalActivityLog,
    ProposalComment,
    ProposalDocument,
    ProposalStatus,
    ProposalVersion,
    Requirement,
    ReviewAction,
    User,
    Workspace,
)
from app.ai.drafter import ProposalDrafter
from app.logger import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger("proposals_api")
router = APIRouter(prefix="/api/workspaces", tags=["proposals"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class ProposalResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    requirement_id: UUID
    section_title: str
    section_number: Optional[str]
    ai_draft: Optional[str]
    current_content: Optional[str]
    word_count: Optional[int]
    target_word_count: Optional[int]
    status: ProposalStatus
    quality_score: Optional[float]
    quality_badge: Optional[str]
    ai_provider_used: Optional[str]
    assigned_to: Optional[UUID]
    reviewed_by: Optional[UUID]
    reviewed_at: Optional[datetime]
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProposalSummary(BaseModel):
    """Lightweight version for list views — no draft content."""
    id: UUID
    section_title: str
    section_number: Optional[str]
    word_count: Optional[int]
    target_word_count: Optional[int]
    status: ProposalStatus
    quality_badge: Optional[str]
    assigned_to: Optional[UUID]
    sort_order: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProposalUpdate(BaseModel):
    current_content: str
    section_title: Optional[str] = None
    change_summary: Optional[str] = None  # brief note for version history


class ProposalStatusUpdate(BaseModel):
    status: ProposalStatus
    reason: Optional[str] = None  # required when rejecting or requesting edits


class BulkStatusUpdate(BaseModel):
    proposal_ids: List[UUID]
    status: ProposalStatus
    reason: Optional[str] = None


class AssignRequest(BaseModel):
    user_id: UUID


class CommentCreate(BaseModel):
    text: str
    parent_id: Optional[UUID] = None  # for threaded replies


class CommentResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    user_id: UUID
    text: str
    resolved: bool
    parent_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VersionResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    version_num: int
    content: str
    edited_by: Optional[UUID]
    change_summary: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    user_id: UUID
    action: ReviewAction
    detail: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ProposalDocumentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    title: str
    cover_page: Optional[str]
    executive_summary: Optional[str]
    structure: List[Dict[str, Any]]
    total_word_count: Optional[int]
    approved_sections: int
    total_sections: int
    completion_pct: float
    ai_provider_used: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateProposalsResponse(BaseModel):
    job_id: UUID
    message: str


# ─── Proposal Section Endpoints ─────────────────────────────────────────────

@router.get("/{workspace_id}/proposals", response_model=List[ProposalSummary])
async def list_proposals(
    workspace_id: UUID,
    status_filter: Optional[ProposalStatus] = Query(default=None, alias="status"),
    assigned_to: Optional[UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """List all proposal sections for a workspace. Filterable by status and assignee."""
    await _check_workspace(workspace_id, current_user, session)

    stmt = select(Proposal).where(Proposal.workspace_id == workspace_id)
    if status_filter:
        stmt = stmt.where(Proposal.status == status_filter)
    if assigned_to:
        stmt = stmt.where(Proposal.assigned_to == assigned_to)
    stmt = stmt.order_by(Proposal.sort_order.asc(), Proposal.created_at.asc())

    result = await session.execute(stmt)
    return [ProposalSummary.model_validate(p) for p in result.scalars().all()]


@router.post("/{workspace_id}/proposals/generate", response_model=GenerateProposalsResponse, status_code=202)
async def generate_proposals(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Queue full proposal drafting for all requirements in this workspace."""
    await _check_workspace(workspace_id, current_user, session)

    job = Job(workspace_id=workspace_id, job_type="draft", status=JobStatus.PENDING, progress_pct=0)
    session.add(job)
    await session.flush()
    await session.refresh(job)

    task = celery_app.send_task("tasks.draft.draft_proposals", args=[str(job.id), str(workspace_id)], task_id=str(job.id))
    job.task_id = task.id
    session.add(job)

    logger.info("Draft queued", workspace_id=str(workspace_id), job_id=str(job.id))
    return GenerateProposalsResponse(job_id=job.id, message="Proposal drafting queued")


@router.post("/{workspace_id}/proposals/generate-document", response_model=GenerateProposalsResponse, status_code=202)
async def generate_full_document(
    workspace_id: UUID,
    target_words_per_section: int = Query(default=400, ge=100, le=1500),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """
    Auto-draft a complete structured proposal document — cover page, executive
    summary, and all sections mapped to each RFP question in document order.
    """
    await _check_workspace(workspace_id, current_user, session)

    job = Job(workspace_id=workspace_id, job_type="draft_document", status=JobStatus.PENDING, progress_pct=0)
    session.add(job)
    await session.flush()
    await session.refresh(job)

    task = celery_app.send_task(
        "tasks.draft.draft_full_document",
        args=[str(job.id), str(workspace_id), target_words_per_section],
        task_id=str(job.id),
    )
    job.task_id = task.id
    session.add(job)

    logger.info("Full document draft queued", workspace_id=str(workspace_id))
    return GenerateProposalsResponse(job_id=job.id, message="Full document drafting queued")


@router.get("/{workspace_id}/proposals/document", response_model=ProposalDocumentResponse)
async def get_proposal_document(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Get the assembled proposal document for this workspace."""
    await _check_workspace(workspace_id, current_user, session)

    result = await session.execute(
        select(ProposalDocument).where(ProposalDocument.workspace_id == workspace_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="No proposal document found — run generate-document first")

    return _serialize_document(doc)


@router.patch("/{workspace_id}/proposals/document", response_model=ProposalDocumentResponse)
async def update_proposal_document(
    workspace_id: UUID,
    cover_page: Optional[str] = None,
    executive_summary: Optional[str] = None,
    title: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Update the cover page or executive summary of the assembled document."""
    await _check_workspace(workspace_id, current_user, session)

    result = await session.execute(
        select(ProposalDocument).where(ProposalDocument.workspace_id == workspace_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Proposal document not found")

    if cover_page is not None:
        doc.cover_page = cover_page
    if executive_summary is not None:
        doc.executive_summary = executive_summary
    if title is not None:
        doc.title = title
    doc.updated_at = datetime.utcnow()
    session.add(doc)
    await session.flush()
    await session.refresh(doc)
    return _serialize_document(doc)


@router.get("/{workspace_id}/proposals/{section_id}", response_model=ProposalResponse)
async def get_proposal(
    workspace_id: UUID,
    section_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    await _check_workspace(workspace_id, current_user, session)
    return ProposalResponse.model_validate(await _get_proposal(workspace_id, section_id, session))


@router.put("/{workspace_id}/proposals/{section_id}", response_model=ProposalResponse)
async def update_proposal(
    workspace_id: UUID,
    section_id: UUID,
    payload: ProposalUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Edit a proposal section. Previous content is saved to version history."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    # Save current content as version before overwriting
    ver_result = await session.execute(
        select(ProposalVersion)
        .where(ProposalVersion.proposal_id == section_id)
        .order_by(ProposalVersion.version_num.desc())
    )
    latest = ver_result.scalars().first()
    session.add(ProposalVersion(
        proposal_id=proposal.id,
        content=proposal.current_content or "",
        version_num=(latest.version_num + 1) if latest else 1,
        edited_by=current_user.id,
        change_summary=payload.change_summary,
    ))

    proposal.current_content = payload.current_content
    proposal.word_count = len(payload.current_content.split())
    if payload.section_title:
        proposal.section_title = payload.section_title
    if proposal.status == ProposalStatus.REJECTED:
        # Editing a rejected section moves it back to pending review
        proposal.status = ProposalStatus.PENDING
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)

    # Log the edit
    session.add(ProposalActivityLog(
        proposal_id=proposal.id,
        user_id=current_user.id,
        action=ReviewAction.COMMENT,
        detail=f"Section edited. {payload.change_summary or ''}".strip(),
    ))

    await session.flush()
    await session.refresh(proposal)
    logger.info("Proposal updated", proposal_id=str(section_id), user=str(current_user.id))
    return ProposalResponse.model_validate(proposal)


@router.post("/{workspace_id}/proposals/{section_id}/regenerate")
async def regenerate_proposal(
    workspace_id: UUID,
    section_id: UUID,
    provider_id: Optional[UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """
    Re-draft a proposal section with SSE streaming.
    Optionally pass provider_id to use a specific AI provider.
    """
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)
    requirement = await session.get(Requirement, proposal.requirement_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Load matched capabilities
    from app.ai.providers.registry import get_provider_for_org
    from sqlmodel import select as _select
    from app.db.models import ComplianceItem, ComplianceStatus, Capability

    comp_result = await session.execute(
        _select(ComplianceItem).where(
            ComplianceItem.requirement_id == requirement.id,
            ComplianceItem.workspace_id == workspace_id,
            ComplianceItem.status != ComplianceStatus.GAP,
        ).order_by(ComplianceItem.match_score.desc())
    )
    items = comp_result.scalars().all()
    capabilities = []
    for item in items[:3]:
        if item.capability_id:
            cap = await session.get(Capability, item.capability_id)
            if cap:
                capabilities.append({"title": cap.title, "description": cap.description, "score": item.match_score or 0.0})

    provider = await get_provider_for_org(current_user.org_id, "drafter", session, override_provider_id=provider_id)

    async def event_stream():
        chunks = []
        try:
            async for chunk in provider.draft_section(
                requirement=requirement.text,
                capabilities=capabilities,
                section_title=proposal.section_title,
                target_words=proposal.target_word_count or settings.PROPOSAL_TARGET_WORDS,
            ):
                chunks.append(chunk)
                yield f"data: {json.dumps({'event': 'chunk', 'text': chunk})}\n\n"

            complete = "".join(chunks)
            # Persist the regenerated draft via a new DB session
            from app.db.database import async_session_factory
            async with async_session_factory() as save_session:
                p = await save_session.get(Proposal, proposal.id)
                if p:
                    ver_r = await save_session.execute(
                        select(ProposalVersion).where(ProposalVersion.proposal_id == p.id).order_by(ProposalVersion.version_num.desc())
                    )
                    lv = ver_r.scalars().first()
                    save_session.add(ProposalVersion(
                        proposal_id=p.id,
                        content=p.current_content or "",
                        version_num=(lv.version_num + 1) if lv else 1,
                        edited_by=current_user.id,
                        change_summary="Regenerated via streaming",
                    ))
                    p.ai_draft = complete
                    p.current_content = complete
                    p.word_count = len(complete.split())
                    p.status = ProposalStatus.PENDING
                    p.ai_provider_used = provider.provider_name
                    p.updated_at = datetime.utcnow()
                    save_session.add(p)
                    await save_session.commit()

            yield f"data: {json.dumps({'event': 'done', 'word_count': len(complete.split()), 'provider': provider.provider_name})}\n\n"
        except Exception as exc:
            logger.error("Streaming regeneration failed", error=str(exc))
            yield f"data: {json.dumps({'event': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.patch("/{workspace_id}/proposals/{section_id}/status", response_model=ProposalResponse)
async def update_proposal_status(
    workspace_id: UUID,
    section_id: UUID,
    payload: ProposalStatusUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Approve, reject, or mark a section as needing edits."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    if payload.status in (ProposalStatus.REJECTED, ProposalStatus.NEEDS_EDIT) and not payload.reason:
        raise HTTPException(status_code=400, detail="A reason is required when rejecting or requesting edits")

    proposal.status = payload.status
    proposal.reviewed_by = current_user.id
    proposal.reviewed_at = datetime.utcnow()
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)

    # Map status to review action for the audit log
    action_map = {
        ProposalStatus.APPROVED: ReviewAction.APPROVE,
        ProposalStatus.REJECTED: ReviewAction.REJECT,
        ProposalStatus.NEEDS_EDIT: ReviewAction.REQUEST_EDIT,
        ProposalStatus.IN_REVIEW: ReviewAction.COMMENT,
    }
    session.add(ProposalActivityLog(
        proposal_id=proposal.id,
        user_id=current_user.id,
        action=action_map.get(payload.status, ReviewAction.COMMENT),
        detail=payload.reason,
    ))

    # Recompute document completion %
    await _refresh_document_stats(workspace_id, session)

    await session.flush()
    await session.refresh(proposal)
    logger.info("Proposal status updated", proposal_id=str(section_id), status=payload.status)
    return ProposalResponse.model_validate(proposal)


@router.post("/{workspace_id}/proposals/bulk-status", response_model=Dict[str, Any])
async def bulk_update_status(
    workspace_id: UUID,
    payload: BulkStatusUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Approve or reject multiple sections at once — useful for the review dashboard."""
    await _check_workspace(workspace_id, current_user, session)

    if payload.status in (ProposalStatus.REJECTED, ProposalStatus.NEEDS_EDIT) and not payload.reason:
        raise HTTPException(status_code=400, detail="Reason required for reject/needs-edit")

    updated = 0
    action_map = {
        ProposalStatus.APPROVED: ReviewAction.APPROVE,
        ProposalStatus.REJECTED: ReviewAction.REJECT,
        ProposalStatus.NEEDS_EDIT: ReviewAction.REQUEST_EDIT,
    }

    for pid in payload.proposal_ids:
        p = await session.get(Proposal, pid)
        if p and p.workspace_id == workspace_id:
            p.status = payload.status
            p.reviewed_by = current_user.id
            p.reviewed_at = datetime.utcnow()
            p.updated_at = datetime.utcnow()
            session.add(p)
            session.add(ProposalActivityLog(
                proposal_id=p.id,
                user_id=current_user.id,
                action=action_map.get(payload.status, ReviewAction.COMMENT),
                detail=payload.reason,
            ))
            updated += 1

    await _refresh_document_stats(workspace_id, session)
    logger.info("Bulk status update", workspace_id=str(workspace_id), count=updated, status=payload.status)
    return {"updated": updated, "status": payload.status}


@router.post("/{workspace_id}/proposals/{section_id}/assign", response_model=ProposalResponse)
async def assign_proposal(
    workspace_id: UUID,
    section_id: UUID,
    payload: AssignRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Assign a proposal section to a specific reviewer."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    proposal.assigned_to = payload.user_id
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)

    session.add(ProposalActivityLog(
        proposal_id=proposal.id,
        user_id=current_user.id,
        action=ReviewAction.ASSIGN,
        detail=f"Assigned to user {payload.user_id}",
    ))

    await session.flush()
    await session.refresh(proposal)
    return ProposalResponse.model_validate(proposal)


# ─── Comments ────────────────────────────────────────────────────────────────

@router.get("/{workspace_id}/proposals/{section_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    workspace_id: UUID,
    section_id: UUID,
    include_resolved: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    await _check_workspace(workspace_id, current_user, session)
    await _get_proposal(workspace_id, section_id, session)

    stmt = select(ProposalComment).where(ProposalComment.proposal_id == section_id)
    if not include_resolved:
        stmt = stmt.where(ProposalComment.resolved == False)
    stmt = stmt.order_by(ProposalComment.created_at.asc())

    result = await session.execute(stmt)
    return [CommentResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/{workspace_id}/proposals/{section_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    workspace_id: UUID,
    section_id: UUID,
    payload: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Add an inline comment or reply to a proposal section."""
    await _check_workspace(workspace_id, current_user, session)
    await _get_proposal(workspace_id, section_id, session)

    comment = ProposalComment(
        proposal_id=section_id,
        user_id=current_user.id,
        text=payload.text,
        parent_id=payload.parent_id,
    )
    session.add(comment)

    session.add(ProposalActivityLog(
        proposal_id=section_id,
        user_id=current_user.id,
        action=ReviewAction.COMMENT,
        detail=payload.text[:200],
    ))

    await session.flush()
    await session.refresh(comment)
    return CommentResponse.model_validate(comment)


@router.patch("/{workspace_id}/proposals/{section_id}/comments/{comment_id}/resolve", response_model=CommentResponse)
async def resolve_comment(
    workspace_id: UUID,
    section_id: UUID,
    comment_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Mark a comment as resolved."""
    await _check_workspace(workspace_id, current_user, session)

    comment = await session.get(ProposalComment, comment_id)
    if not comment or comment.proposal_id != section_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.resolved = True
    comment.updated_at = datetime.utcnow()
    session.add(comment)
    await session.flush()
    await session.refresh(comment)
    return CommentResponse.model_validate(comment)


# ─── Version History ─────────────────────────────────────────────────────────

@router.get("/{workspace_id}/proposals/{section_id}/versions", response_model=List[VersionResponse])
async def list_versions(
    workspace_id: UUID,
    section_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Return the full version history for a proposal section."""
    await _check_workspace(workspace_id, current_user, session)
    await _get_proposal(workspace_id, section_id, session)

    result = await session.execute(
        select(ProposalVersion)
        .where(ProposalVersion.proposal_id == section_id)
        .order_by(ProposalVersion.version_num.desc())
    )
    return [VersionResponse.model_validate(v) for v in result.scalars().all()]


@router.post("/{workspace_id}/proposals/{section_id}/versions/{version_id}/restore", response_model=ProposalResponse)
async def restore_version(
    workspace_id: UUID,
    section_id: UUID,
    version_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Restore a proposal section to a previous version."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    version = await session.get(ProposalVersion, version_id)
    if not version or version.proposal_id != section_id:
        raise HTTPException(status_code=404, detail="Version not found")

    # Save current content as a new version before restoring
    ver_result = await session.execute(
        select(ProposalVersion).where(ProposalVersion.proposal_id == section_id).order_by(ProposalVersion.version_num.desc())
    )
    latest = ver_result.scalars().first()
    session.add(ProposalVersion(
        proposal_id=proposal.id,
        content=proposal.current_content or "",
        version_num=(latest.version_num + 1) if latest else 1,
        edited_by=current_user.id,
        change_summary=f"Saved before restoring to version {version.version_num}",
    ))

    proposal.current_content = version.content
    proposal.word_count = len(version.content.split())
    proposal.status = ProposalStatus.PENDING
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)

    session.add(ProposalActivityLog(
        proposal_id=proposal.id,
        user_id=current_user.id,
        action=ReviewAction.COMMENT,
        detail=f"Restored to version {version.version_num}",
    ))

    await session.flush()
    await session.refresh(proposal)
    return ProposalResponse.model_validate(proposal)


# ─── Activity Log ────────────────────────────────────────────────────────────

@router.get("/{workspace_id}/proposals/{section_id}/activity", response_model=List[ActivityLogResponse])
async def get_activity_log(
    workspace_id: UUID,
    section_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Full audit trail for a proposal section."""
    await _check_workspace(workspace_id, current_user, session)
    await _get_proposal(workspace_id, section_id, session)

    result = await session.execute(
        select(ProposalActivityLog)
        .where(ProposalActivityLog.proposal_id == section_id)
        .order_by(ProposalActivityLog.created_at.desc())
    )
    return [ActivityLogResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/{workspace_id}/proposals-activity", response_model=List[ActivityLogResponse])
async def get_workspace_activity(
    workspace_id: UUID,
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Recent activity across all proposal sections in a workspace — for the review dashboard."""
    await _check_workspace(workspace_id, current_user, session)

    # Get all proposal IDs for this workspace
    proposal_result = await session.execute(
        select(Proposal.id).where(Proposal.workspace_id == workspace_id)
    )
    proposal_ids = [row[0] for row in proposal_result.all()]

    if not proposal_ids:
        return []

    result = await session.execute(
        select(ProposalActivityLog)
        .where(ProposalActivityLog.proposal_id.in_(proposal_ids))
        .order_by(ProposalActivityLog.created_at.desc())
        .limit(limit)
    )
    return [ActivityLogResponse.model_validate(a) for a in result.scalars().all()]


# ─── Review Dashboard Stats ──────────────────────────────────────────────────

@router.get("/{workspace_id}/proposals-stats")
async def get_proposals_stats(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Summary stats for the bid manager review dashboard."""
    await _check_workspace(workspace_id, current_user, session)

    result = await session.execute(
        select(Proposal).where(Proposal.workspace_id == workspace_id)
    )
    proposals = result.scalars().all()

    total = len(proposals)
    by_status = {}
    for p in proposals:
        by_status[p.status.value] = by_status.get(p.status.value, 0) + 1

    total_words = sum(p.word_count or 0 for p in proposals)
    approved = by_status.get("approved", 0)
    completion_pct = round(approved / total * 100, 1) if total > 0 else 0.0

    # Sections with open comments
    comment_result = await session.execute(
        select(ProposalComment).where(
            ProposalComment.proposal_id.in_([p.id for p in proposals]),
            ProposalComment.resolved == False,
        )
    )
    open_comments = len(comment_result.scalars().all())

    return {
        "total_sections": total,
        "by_status": by_status,
        "completion_pct": completion_pct,
        "total_word_count": total_words,
        "open_comments": open_comments,
        "needs_attention": by_status.get("rejected", 0) + by_status.get("needs_edit", 0),
    }


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_document(doc: ProposalDocument) -> ProposalDocumentResponse:
    try:
        structure = json.loads(doc.structure) if doc.structure else []
    except Exception:
        structure = []
    return ProposalDocumentResponse(
        id=doc.id,
        workspace_id=doc.workspace_id,
        title=doc.title,
        cover_page=doc.cover_page,
        executive_summary=doc.executive_summary,
        structure=structure,
        total_word_count=doc.total_word_count,
        approved_sections=doc.approved_sections,
        total_sections=doc.total_sections,
        completion_pct=doc.completion_pct,
        ai_provider_used=doc.ai_provider_used,
        status=doc.status,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


async def _refresh_document_stats(workspace_id: UUID, session: AsyncSession) -> None:
    """Keep ProposalDocument completion stats in sync after status changes."""
    doc_result = await session.execute(
        select(ProposalDocument).where(ProposalDocument.workspace_id == workspace_id)
    )
    doc = doc_result.scalars().first()
    if not doc:
        return

    proposal_result = await session.execute(
        select(Proposal).where(Proposal.workspace_id == workspace_id)
    )
    proposals = proposal_result.scalars().all()
    total = len(proposals)
    approved = sum(1 for p in proposals if p.status == ProposalStatus.APPROVED)

    doc.total_sections = total
    doc.approved_sections = approved
    doc.completion_pct = round(approved / total * 100, 1) if total > 0 else 0.0
    doc.updated_at = datetime.utcnow()
    session.add(doc)


async def _check_workspace(workspace_id: UUID, user: User, session: AsyncSession) -> Workspace:
    workspace = await session.get(Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace


async def _get_proposal(workspace_id: UUID, proposal_id: UUID, session: AsyncSession) -> Proposal:
    proposal = await session.get(Proposal, proposal_id)
    if not proposal or proposal.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Proposal section not found")
    return proposal
