"""Abstract base class for AI providers."""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional


class AIProvider(ABC):
    """Abstract interface for all AI provider implementations.

    All RFP AI operations are routed through this abstraction so the
    underlying model can be swapped without changing business logic.
    """

    @abstractmethod
    async def extract_requirements(self, text: str) -> Dict[str, Any]:
        """Extract structured requirements from raw RFP text.

        Args:
            text: Full RFP document text.

        Returns:
            Dict with keys:
                - mandatory_requirements: list[str]
                - evaluation_criteria: list[str]
                - deadlines: list[str]
                - budget: str | None
                - qa_sections: list[str]
        """
        ...

    @abstractmethod
    async def draft_section(
        self,
        requirement: str,
        capabilities: List[Dict[str, Any]],
        section_title: str = "",
        target_words: int = 500,
    ) -> AsyncGenerator[str, None]:
        """Stream a proposal section draft.

        Args:
            requirement: The requirement text to address.
            capabilities: List of matched capability dicts (title, description, score).
            section_title: Optional heading for context.
            target_words: Approximate word-count target.

        Yields:
            Text chunks as they are streamed from the model.
        """
        ...

    @abstractmethod
    async def score_quality(
        self,
        draft: str,
        requirement: str,
    ) -> Dict[str, Any]:
        """Score a proposal draft against a requirement on 4 axes.

        Args:
            draft: The proposal section text.
            requirement: The original requirement text.

        Returns:
            Dict with keys:
                - compliance_coverage: float 0-1
                - clarity: float 0-1
                - evidence_strength: float 0-1
                - word_count_fit: float 0-1
                - overall: float 0-1
                - badge: "Excellent" | "Good" | "Needs Work"
        """
        ...

    @abstractmethod
    async def generate_decision(
        self,
        win_score: float,
        gaps: List[str],
        history: List[Dict[str, Any]],
        sector: str = "",
        budget: Optional[float] = None,
    ) -> str:
        """Generate a GO/NO-GO decision narrative.

        Args:
            win_score: Overall win probability score (0-100).
            gaps: List of compliance gap descriptions.
            history: List of historical bid summary dicts.
            sector: Procurement sector name.
            budget: Budget value for context.

        Returns:
            3-sentence recommendation with top risks and confidence level.
        """
        ...
