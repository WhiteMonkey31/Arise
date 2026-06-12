import json
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from app.ai.providers.base import AIProvider
from app.logger import get_logger

logger = get_logger("grok_provider")

# Grok uses an OpenAI-compatible API endpoint
GROK_BASE_URL = "https://api.x.ai/v1"


class GrokProvider(AIProvider):
    """xAI Grok provider — uses the OpenAI-compatible SDK with x.ai base URL."""

    provider_name = "grok"

    def __init__(self, api_key: str, model_name: str = "grok-2-latest") -> None:
        self._client = AsyncOpenAI(api_key=api_key, base_url=GROK_BASE_URL)
        self.model = model_name
        logger.info("GrokProvider initialized", model=model_name)

    async def extract_requirements(self, text: str) -> Dict[str, Any]:
        truncated = text[:100_000]
        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert RFP analyst. Extract structured info and return ONLY valid JSON with keys: "
                        "mandatory_requirements (list), evaluation_criteria (list), deadlines (list), "
                        "budget (string or null), qa_sections (list)."
                    ),
                },
                {"role": "user", "content": f"Extract requirements:\n\n{truncated}"},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"mandatory_requirements": [], "evaluation_criteria": [], "deadlines": [], "budget": None, "qa_sections": []}

    async def draft_section(
        self,
        requirement: str,
        capabilities: List[Dict[str, Any]],
        section_title: str = "",
        target_words: int = 500,
    ) -> AsyncGenerator[str, None]:
        cap_text = "\n".join(
            f"- [{c.get('score', 0):.2f}] {c.get('title', '')}: {c.get('description', '')[:300]}"
            for c in capabilities
        )
        stream = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=1500,
            stream=True,
            messages=[
                {"role": "system", "content": "You are an expert proposal writer for RFPs."},
                {
                    "role": "user",
                    "content": (
                        f"Write a proposal section (~{target_words} words).\n"
                        f"Requirement: {requirement}\n"
                        f"Section: {section_title or 'Response'}\n"
                        f"Evidence:\n{cap_text}\n\n"
                        "Structure: opening → evidence → methodology → commitment."
                    ),
                },
            ],
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def score_quality(self, draft: str, requirement: str) -> Dict[str, Any]:
        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=512,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Score the draft on: compliance_coverage, clarity, evidence_strength, word_count_fit (all 0-1). "
                        "Return JSON with these keys + overall (average) + badge (Excellent/Good/Needs Work) + feedback."
                    ),
                },
                {"role": "user", "content": f"Requirement:\n{requirement}\n\nDraft:\n{draft[:3000]}"},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"compliance_coverage": 0.5, "clarity": 0.5, "evidence_strength": 0.5, "word_count_fit": 0.5, "overall": 0.5, "badge": "Needs Work", "feedback": "Could not parse score."}

    async def generate_decision(
        self,
        win_score: float,
        gaps: List[str],
        history: List[Dict[str, Any]],
        sector: str = "",
        budget: Optional[float] = None,
    ) -> str:
        gaps_text = "\n".join(f"- {g}" for g in gaps[:10]) if gaps else "None"
        win_rate = sum(1 for b in history if b.get("outcome") == "win") / max(len(history), 1) * 100
        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=300,
            messages=[
                {"role": "system", "content": "Strategic bid advisor. Give exactly 3 sentences: 1) GO/NO-GO + confidence, 2) top 2 risks, 3) key factor."},
                {"role": "user", "content": f"Win Score: {win_score:.1f}/100\nSector: {sector}\nHistorical win rate: {win_rate:.0f}%\nGaps:\n{gaps_text}"},
            ],
        )
        return response.choices[0].message.content or ""
