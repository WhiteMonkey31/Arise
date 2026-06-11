"""OpenAI GPT-4o fallback implementation of AIProvider."""

import json
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from app.ai.providers.base import AIProvider
from app.config import settings
from app.logger import get_logger

logger = get_logger("openai_provider")


class OpenAIProvider(AIProvider):
    """AI provider backed by OpenAI GPT-4o (fallback)."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        logger.info("OpenAIProvider initialized", model=self.model)

    async def extract_requirements(self, text: str) -> Dict[str, Any]:
        """Extract structured requirements from RFP text using GPT-4o.

        Args:
            text: Full RFP document text.

        Returns:
            Structured dict with requirements, criteria, deadlines, budget, sections.
        """
        truncated = text[:120_000] if len(text) > 120_000 else text

        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=4096,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert RFP analyst. Extract structured information from the given RFP text. "
                        "Return valid JSON with keys: mandatory_requirements (list), evaluation_criteria (list), "
                        "deadlines (list), budget (string or null), qa_sections (list)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Extract requirements from this RFP:\n\n{truncated}",
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {
                "mandatory_requirements": [],
                "evaluation_criteria": [],
                "deadlines": [],
                "budget": None,
                "qa_sections": [],
            }

        logger.info(
            "Requirements extracted via GPT-4o",
            n_requirements=len(result.get("mandatory_requirements", [])),
        )
        return result

    async def draft_section(
        self,
        requirement: str,
        capabilities: List[Dict[str, Any]],
        section_title: str = "",
        target_words: int = 500,
    ) -> AsyncGenerator[str, None]:
        """Stream a proposal section using GPT-4o streaming.

        Args:
            requirement: The requirement to address.
            capabilities: Matched capability dicts.
            section_title: Section heading for context.
            target_words: Word count target.

        Yields:
            Text chunks from the streaming response.
        """
        cap_text = "\n".join(
            f"- [{c.get('score', 0):.2f}] {c.get('title', '')}: {c.get('description', '')[:300]}"
            for c in capabilities
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert proposal writer for government and enterprise RFPs. "
                    "Write professional, evidence-based responses."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Write a proposal section (~{target_words} words) addressing:\n\n"
                    f"**Requirement:** {requirement}\n\n"
                    f"**Evidence:**\n{cap_text}\n\n"
                    "Structure: opening → evidence → methodology → commitment."
                ),
            },
        ]

        stream = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=1500,
            stream=True,
            messages=messages,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def score_quality(
        self,
        draft: str,
        requirement: str,
    ) -> Dict[str, Any]:
        """Score a proposal draft using GPT-4o.

        Args:
            draft: The proposal section text.
            requirement: The requirement being addressed.

        Returns:
            Quality scores dict with badge.
        """
        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=512,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Score the proposal draft on: compliance_coverage (0-1), clarity (0-1), "
                        "evidence_strength (0-1), word_count_fit (0-1). Compute overall average. "
                        "Set badge: Excellent (>=0.80), Good (0.60-0.79), Needs Work (<0.60). "
                        "Return JSON with these keys plus 'feedback' (one sentence)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Requirement:\n{requirement}\n\nDraft:\n{draft[:3000]}"
                    ),
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {
                "compliance_coverage": 0.5,
                "clarity": 0.5,
                "evidence_strength": 0.5,
                "word_count_fit": 0.5,
                "overall": 0.5,
                "badge": "Needs Work",
                "feedback": "Could not parse quality score.",
            }
        return result

    async def generate_decision(
        self,
        win_score: float,
        gaps: List[str],
        history: List[Dict[str, Any]],
        sector: str = "",
        budget: Optional[float] = None,
    ) -> str:
        """Generate GO/NO-GO recommendation using GPT-4o.

        Args:
            win_score: Overall win probability (0-100).
            gaps: Compliance gap descriptions.
            history: Historical bid records.
            sector: Procurement sector.
            budget: Bid budget.

        Returns:
            3-sentence decision narrative.
        """
        gaps_text = "\n".join(f"- {g}" for g in gaps[:10]) or "None identified"
        win_rate = (
            sum(1 for b in history if b.get("outcome") == "win") / max(len(history), 1) * 100
            if history
            else 0
        )

        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=300,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strategic bid advisor. Provide exactly 3 sentences: "
                        "1) GO/NO-GO recommendation with confidence, "
                        "2) Top 2 risks, "
                        "3) Key decision factor."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Win Score: {win_score:.1f}/100\n"
                        f"Sector: {sector}\nBudget: {budget}\n"
                        f"Historical win rate: {win_rate:.0f}%\n"
                        f"Gaps:\n{gaps_text}"
                    ),
                },
            ],
        )
        return response.choices[0].message.content or ""
