import json
from typing import Any, AsyncGenerator, Dict, List, Optional

import google.generativeai as genai

from app.ai.providers.base import AIProvider
from app.logger import get_logger

logger = get_logger("gemini_provider")

EXTRACT_SYSTEM = """You are an expert RFP analyst. Extract structured information from the RFP text.
Return ONLY valid JSON with these keys:
{
  "mandatory_requirements": ["..."],
  "evaluation_criteria": ["..."],
  "deadlines": ["..."],
  "budget": "string or null",
  "qa_sections": ["..."]
}"""

SCORE_SYSTEM = """Score the proposal draft vs the requirement. Return ONLY valid JSON:
{
  "compliance_coverage": 0.0-1.0,
  "clarity": 0.0-1.0,
  "evidence_strength": 0.0-1.0,
  "word_count_fit": 0.0-1.0,
  "overall": 0.0-1.0,
  "badge": "Excellent|Good|Needs Work",
  "feedback": "one sentence"
}
Excellent >= 0.80, Good 0.60-0.79, Needs Work below 0.60."""


class GeminiProvider(AIProvider):
    provider_name = "gemini"

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-pro") -> None:
        genai.configure(api_key=api_key)
        self.model_name = model_name
        self._model = genai.GenerativeModel(model_name)
        logger.info("GeminiProvider initialized", model=model_name)

    async def extract_requirements(self, text: str) -> Dict[str, Any]:
        truncated = text[:100_000]
        prompt = f"{EXTRACT_SYSTEM}\n\nExtract requirements from this RFP:\n\n{truncated}"
        response = await self._model.generate_content_async(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("Failed to parse Gemini extraction JSON", raw=raw[:200])
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
        prompt = (
            f"You are an expert proposal writer for government and enterprise RFPs.\n\n"
            f"Write a proposal section (~{target_words} words) responding to:\n"
            f"**Requirement:** {requirement}\n\n"
            f"**Section:** {section_title or 'Response'}\n\n"
            f"**Evidence:**\n{cap_text}\n\n"
            "Structure: opening → evidence → methodology → commitment. Do not include the title."
        )
        async for chunk in await self._model.generate_content_async(prompt, stream=True):
            if chunk.text:
                yield chunk.text

    async def score_quality(self, draft: str, requirement: str) -> Dict[str, Any]:
        prompt = f"{SCORE_SYSTEM}\n\nRequirement:\n{requirement}\n\nDraft:\n{draft[:3000]}"
        response = await self._model.generate_content_async(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
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
        prompt = (
            "You are a strategic bid advisor. Give exactly 3 sentences:\n"
            "1. GO/NO-GO recommendation with confidence.\n"
            "2. Top 2 risks.\n"
            "3. Key decision factor.\n\n"
            f"Win Score: {win_score:.1f}/100\nSector: {sector}\n"
            f"Historical win rate: {win_rate:.0f}%\nGaps:\n{gaps_text}"
        )
        response = await self._model.generate_content_async(prompt)
        return response.text.strip()
