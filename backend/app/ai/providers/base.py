from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional


class AIProvider(ABC):
    # Subclasses set this so the registry knows the name
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
