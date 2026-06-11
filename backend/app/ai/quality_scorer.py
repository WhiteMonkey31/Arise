"""Proposal quality auto-scorer using Claude."""

from typing import Any, Dict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers.claude import ClaudeProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.config import settings
from app.db.models import Proposal, Requirement
from app.logger import get_logger

logger = get_logger("quality_scorer")


def get_scoring_provider():
    """Return configured scoring AI provider."""
    if settings.SCORER_PROVIDER == "openai":
        return OpenAIProvider()
    return ClaudeProvider()


class QualityScorer:
    """Auto-scores proposal drafts on 4 quality axes using AI."""

    def __init__(self) -> None:
        self.provider = get_scoring_provider()

    async def score_proposal(
        self,
        proposal_id: UUID,
        session: AsyncSession,
    ) -> Dict[str, Any]:
        """Score a proposal section and update its quality fields in DB.

        Args:
            proposal_id: UUID of the Proposal to score.
            session: Async DB session.

        Returns:
            Quality score dict with all axes and badge.
        """
        proposal = await session.get(Proposal, proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")

        requirement = await session.get(Requirement, proposal.requirement_id)
        if not requirement:
            raise ValueError(f"Requirement {proposal.requirement_id} not found")

        draft = proposal.current_content or proposal.ai_draft or ""
        if not draft.strip():
            return {
                "compliance_coverage": 0.0,
                "clarity": 0.0,
                "evidence_strength": 0.0,
                "word_count_fit": 0.0,
                "overall": 0.0,
                "badge": "Needs Work",
                "feedback": "No draft content to score.",
            }

        scores = await self.provider.score_quality(
            draft=draft,
            requirement=requirement.text,
        )

        # Persist scores
        proposal.quality_score = scores.get("overall", 0.0)
        proposal.quality_badge = scores.get("badge", "Needs Work")
        session.add(proposal)
        await session.commit()

        logger.info(
            "Quality scored",
            proposal_id=str(proposal_id),
            overall=scores.get("overall"),
            badge=scores.get("badge"),
        )
        return scores

    async def score_text(
        self,
        draft: str,
        requirement_text: str,
    ) -> Dict[str, Any]:
        """Score arbitrary draft text without DB interaction.

        Args:
            draft: Draft proposal text.
            requirement_text: Requirement being addressed.

        Returns:
            Quality score dict.
        """
        return await self.provider.score_quality(draft=draft, requirement=requirement_text)

    @staticmethod
    def badge_from_score(overall: float) -> str:
        """Map an overall score to a quality badge.

        Args:
            overall: Float score 0-1.

        Returns:
            "Excellent", "Good", or "Needs Work".
        """
        if overall >= 0.80:
            return "Excellent"
        elif overall >= 0.60:
            return "Good"
        return "Needs Work"
