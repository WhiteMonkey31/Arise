"""Win probability and GO/NO-GO decision endpoints."""

from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import User, Workspace
from app.scoring.win_score import WinScoreEngine
from app.ai.decision import DecisionEngine
from app.logger import get_logger

logger = get_logger("win_score_api")
router = APIRouter(prefix="/api/workspaces", tags=["win-score"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class WinScoreAxes(BaseModel):
    budget_fit: float
    compliance_pct: float
    past_win_rate: float
    response_time: float
    sector_match: float
    gap_penalty: float


class WinScoreResponse(BaseModel):
    workspace_id: str
    axes: WinScoreAxes
    overall: float
    verdict: str
    go_threshold: int
    total_requirements: int
    gap_count: int


class GoNoGoResponse(BaseModel):
    decision: str
    reasoning: str
    confidence: str
    gap_count: int
    risks: list
    win_score: float
    sector: Optional[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/{workspace_id}/win-score", response_model=WinScoreResponse)
async def get_win_score(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> WinScoreResponse:
    """Compute and return the win probability score with all 6 axes."""
    await _check_workspace(workspace_id, current_user, session)

    engine = WinScoreEngine()
    try:
        result = await engine.compute(workspace_id=workspace_id, session=session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return WinScoreResponse(
        workspace_id=result["workspace_id"],
        axes=WinScoreAxes(**result["axes"]),
        overall=result["overall"],
        verdict=result["verdict"],
        go_threshold=result["go_threshold"],
        total_requirements=result["total_requirements"],
        gap_count=result["gap_count"],
    )


@router.get("/{workspace_id}/go-no-go", response_model=GoNoGoResponse)
async def get_go_no_go(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> GoNoGoResponse:
    """Get GO/NO-GO decision with AI-generated reasoning."""
    await _check_workspace(workspace_id, current_user, session)

    # Compute win score first
    score_engine = WinScoreEngine()
    try:
        score_result = await score_engine.compute(workspace_id=workspace_id, session=session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    # Generate decision narrative
    decision_engine = DecisionEngine()
    try:
        decision = await decision_engine.generate(
            workspace_id=workspace_id,
            win_score=score_result["overall"],
            session=session,
        )
    except Exception as exc:
        logger.error("Decision generation failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Decision generation failed")

    return GoNoGoResponse(**decision)


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
