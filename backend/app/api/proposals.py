"""Proposal section CRUD and streaming regeneration endpoints."""

import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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
    ProposalStatus,
    ProposalVersion,
    Requirement,
    User,
    Workspace,
)
from app.ai.drafter import ProposalDrafter
from app.logger import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger("proposals_api")
router = APIRouter(prefix="/api/workspaces", tags=["proposals"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProposalResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    requirement_id: UUID
    section_title: str
    ai_draft: Optional[str]
    current_content: Optional[str]
    word_count: Optional[int]
    status: ProposalStatus
    quality_score: Optional[float]
    quality_badge: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProposalUpdate(BaseModel):
    current_content: str
    section_title: Optional[str] = None


class ProposalStatusUpdate(BaseModel):
    status: ProposalStatus


class GenerateProposalsResponse(BaseModel):
    job_id: UUID
    message: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/{workspace_id}/proposals", response_model=List[ProposalResponse])
async def list_proposals(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> List[ProposalResponse]:
    """Return all proposal sections for a workspace."""
    await _check_workspace(workspace_id, current_user, session)

    stmt = (
        select(Proposal)
        .where(Proposal.workspace_id == workspace_id)
        .order_by(Proposal.created_at.asc())
    )
    result = await session.execute(stmt)
    proposals = result.scalars().all()
    return [ProposalResponse.model_validate(p) for p in proposals]


@router.post(
    "/{workspace_id}/proposals/generate",
    response_model=GenerateProposalsResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_proposals(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> GenerateProposalsResponse:
    """Queue full proposal drafting for all requirements in this workspace."""
    await _check_workspace(workspace_id, current_user, session)

    job = Job(
        workspace_id=workspace_id,
        job_type="draft",
        status=JobStatus.PENDING,
        progress_pct=0,
    )
    session.add(job)
    await session.flush()
    await session.refresh(job)

    task = celery_app.send_task(
        "tasks.draft.draft_proposals",
        args=[str(job.id), str(workspace_id)],
        task_id=str(job.id),
    )
    job.task_id = task.id
    session.add(job)

    logger.info("Proposal drafting queued", workspace_id=str(workspace_id), job_id=str(job.id))
    return GenerateProposalsResponse(job_id=job.id, message="Proposal drafting queued")


@router.get("/{workspace_id}/proposals/{section_id}", response_model=ProposalResponse)
async def get_proposal(
    workspace_id: UUID,
    section_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> ProposalResponse:
    """Get a single proposal section."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)
    return ProposalResponse.model_validate(proposal)


@router.put("/{workspace_id}/proposals/{section_id}", response_model=ProposalResponse)
async def update_proposal(
    workspace_id: UUID,
    section_id: UUID,
    payload: ProposalUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> ProposalResponse:
    """Update a proposal section's content (saves version history)."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    # Save current content as version
    version_stmt = (
        select(ProposalVersion)
        .where(ProposalVersion.proposal_id == section_id)
        .order_by(ProposalVersion.version_num.desc())
    )
    ver_result = await session.execute(version_stmt)
    latest_version = ver_result.scalars().first()
    next_version_num = (latest_version.version_num + 1) if latest_version else 1

    version = ProposalVersion(
        proposal_id=proposal.id,
        content=proposal.current_content or "",
        version_num=next_version_num,
    )
    session.add(version)

    # Update proposal
    proposal.current_content = payload.current_content
    proposal.word_count = len(payload.current_content.split())
    if payload.section_title:
        proposal.section_title = payload.section_title
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)
    await session.flush()
    await session.refresh(proposal)

    logger.info("Proposal section updated", proposal_id=str(section_id))
    return ProposalResponse.model_validate(proposal)


@router.post("/{workspace_id}/proposals/{section_id}/regenerate")
async def regenerate_proposal(
    workspace_id: UUID,
    section_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> StreamingResponse:
    """Regenerate a proposal section with SSE streaming."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    requirement = await session.get(Requirement, proposal.requirement_id)
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    drafter = ProposalDrafter()

    async def event_stream():
        """SSE generator that streams draft chunks and persists on completion."""
        full_chunks = []
        try:
            async for chunk in drafter.provider.draft_section(
                requirement=requirement.text,
                capabilities=[],  # Will use DB-loaded caps in real flow
                section_title=proposal.section_title,
            ):
                full_chunks.append(chunk)
                yield f"data: {json.dumps({'event': 'chunk', 'text': chunk})}\n\n"

            complete = "".join(full_chunks)
            # Persist async session requires a separate session in background
            yield f"data: {json.dumps({'event': 'done', 'word_count': len(complete.split())})}\n\n"
        except Exception as exc:
            logger.error("Streaming regeneration failed", error=str(exc))
            yield f"data: {json.dumps({'event': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.patch(
    "/{workspace_id}/proposals/{section_id}/status",
    response_model=ProposalResponse,
)
async def update_proposal_status(
    workspace_id: UUID,
    section_id: UUID,
    payload: ProposalStatusUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> ProposalResponse:
    """Approve or reject a proposal section."""
    await _check_workspace(workspace_id, current_user, session)
    proposal = await _get_proposal(workspace_id, section_id, session)

    proposal.status = payload.status
    proposal.updated_at = datetime.utcnow()
    session.add(proposal)
    await session.flush()
    await session.refresh(proposal)

    logger.info("Proposal status updated", proposal_id=str(section_id), status=payload.status)
    return ProposalResponse.model_validate(proposal)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _check_workspace(workspace_id: UUID, user: User, session: AsyncSession) -> Workspace:
    workspace = await session.get(Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace


async def _get_proposal(
    workspace_id: UUID,
    proposal_id: UUID,
    session: AsyncSession,
) -> Proposal:
    proposal = await session.get(Proposal, proposal_id)
    if not proposal or proposal.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Proposal section not found")
    return proposal
