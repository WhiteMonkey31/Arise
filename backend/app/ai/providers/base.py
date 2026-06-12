from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional


class AIProvider(ABC):
    provider_name: str = "base"

    @abstractmethod
    async def extract_requirements(self, text: str) -> Dict[str, Any]: ...

    @abstractmethod
    async def draft_section(
        self,
        requirement: str,
        capabilities: List[Dict[str, Any]],
        section_title: str = "",
        target_words: int = 500,
    ) -> AsyncGenerator[str, None]: ...

    @abstractmethod
    async def score_quality(self, draft: str, requirement: str) -> Dict[str, Any]: ...

    @abstractmethod
    async def generate_decision(
        self,
        win_score: float,
        gaps: List[str],
        history: List[Dict[str, Any]],
        sector: str = "",
        budget: Optional[float] = None,
    ) -> str: ...

    @abstractmethod
    async def draft_full_document(
        self,
        sections: List[Dict[str, Any]],
        org_context: Dict[str, Any],
        target_words_per_section: int = 400,
    ) -> Dict[str, Any]:
        """
        Auto-draft a complete structured proposal document.

        Each item in `sections` contains:
          - section_number: str  (e.g. "3.1", "Q4")
          - section_title: str
          - requirement_text: str
          - capabilities: list of matched capability dicts
          - is_mandatory: bool

        `org_context` contains:
          - org_name: str
          - sector: str
          - deadline: str
          - budget: str

        Returns a dict:
          - cover_page: str
          - executive_summary: str
          - sections: list of {section_number, section_title, content, word_count}
          - total_word_count: int
        """
        ...
