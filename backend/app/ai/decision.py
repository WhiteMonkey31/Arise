"""GO/NO-GO decision reasoning generator."""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.ai.providers.claude import ClaudeProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.config import settings
from app.db.models import Bid, ComplianceItem, ComplianceStatus, Workspace
from app.logger import get_logger

logger = get_logger("decision")


def get_decision_provider():
    """Return configured decision AI provider."""
    if settings.SCORER_PROVIDER == "openai":
        return OpenAIProvider()
    return ClaudeProvider()


class DecisionEngine:
    """Generates GO/NO-GO recommendations using Claude."""

    def __init__(self) -> None:
        self.provider = get_decision_provider()

    async def generate(
        self,
        workspace_id: UUID,
        win_score: float,
        session: AsyncSession,
    ) -> Dict[str, Any]:
        """Generate a full GO/NO-GO decision report.

        Args:
            workspace_id: Workspace to evaluate.
            win_score: Pre-computed win probability score (0-100).
            session: Async DB session.

        Returns:
            Dict with keys: decision, reasoning, confidence, risks, win_score.
        """
        # Load workspace
        workspace = await session.get(Workspace, workspace_id)
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # Gather compliance gaps
        stmt = select(ComplianceItem).where(
            ComplianceItem.workspace_id == workspace_id,
            ComplianceItem.status == ComplianceStatus.GAP,
        )
        result = await session.execute(stmt)
        gap_items = result.scalars().all()
        gaps = [item.notes or "Unmatched requirement" for item in gap_items]

        # Fetch bid history for this org/sector
        bid_stmt = (
            select(Bid)
            .where(Bid.org_id == workspace.org_id)
            .limit(50)
        )
        if workspace.sector:
            bid_stmt = bid_stmt.where(Bid.sector == workspace.sector)
        bid_result = await session.execute(bid_stmt)
        bids = bid_result.scalars().all()

        history = [
            {
                "sector": b.sector,
                "budget": b.budget,
                "outcome": b.outcome.value if b.outcome else None,
                "compliance_pct": b.compliance_pct,
                "score": b.score,
            }
            for b in bids
        ]

        # Call AI provider
        reasoning = await self.provider.generate_decision(
            win_score=win_score,
            gaps=gaps,
            history=history,
            sector=workspace.sector or "",
            budget=None,
        )

        # Parse decision from first sentence
        first_sentence = reasoning.split(".")[0].upper()
        decision = "GO" if "GO" in first_sentence and "NO-GO" not in first_sentence else "NO-GO"

        # Confidence based on score
        if win_score >= 75:
            confidence = "High"
        elif win_score >= 55:
            confidence = "Medium"
        else:
            confidence = "Low"

        logger.info(
            "GO/NO-GO decision generated",
            workspace_id=str(workspace_id),
            decision=decision,
            win_score=win_score,
        )

        return {
            "decision": decision,
            "reasoning": reasoning,
            "confidence": confidence,
            "gap_count": len(gaps),
            "risks": gaps[:5],
            "win_score": win_score,
            "sector": workspace.sector,
        }
