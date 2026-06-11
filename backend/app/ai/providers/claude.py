import json
from typing import Any, AsyncGenerator, Dict, List, Optional

import anthropic

from app.ai.providers.base import AIProvider
from app.config import settings
from app.logger import get_logger

logger = get_logger("claude_provider")

EXTRACT_SYSTEM = """You are an expert RFP analyst. Extract structured information from the given RFP text.
Return ONLY valid JSON with these exact keys:
{
  "mandatory_requirements": ["..."],
  "evaluation_criteria": ["..."],
  "deadlines": ["..."],
  "budget": "string or null",
  "qa_sections": ["..."]
}
Be thorough. Each requirement should be a complete, standalone statement."""

SCORE_SYSTEM = """You are a proposal quality evaluator. Score the draft against the requirement.
Return ONLY valid JSON:
{
  "compliance_coverage": <0.0-1.0>,
  "clarity": <0.0-1.0>,
  "evidence_strength": <0.0-1.0>,
  "word_count_fit": <0.0-1.0>,
  "overall": <0.0-1.0>,
  "badge": "<Excellent|Good|Needs Work>",
  "feedback": "One sentence of actionable feedback"
}
Excellent >= 0.80, Good 0.60-0.79, Needs Work below 0.60."""

DECISION_SYSTEM = """You are a strategic bid advisor. Generate a concise GO/NO-GO recommendation.
Return EXACTLY 3 sentences:
1. Overall recommendation (GO or NO-GO) with confidence level.
2. The top 2 risks or gaps.
3. The key factor that most influences the decision."""


class ClaudeProvider(AIProvider):
    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def extract_requirements(self, text: str) -> Dict[str, Any]:
        truncated = text[:150_000]
        message = await self._client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=EXTRACT_SYSTEM,
            messages=[{"role": "user", "content": f"Extract requirements from this RFP:\n\n{truncated}"}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("Failed to parse extraction JSON", raw=raw[:200])
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
        user_prompt = (
            f"Write a proposal section responding to this requirement:\n\n"
            f"**Requirement:** {requirement}\n\n"
            f"**Section Title:** {section_title or 'Response'}\n\n"
            f"**Evidence (matched capabilities):**\n{cap_text}\n\n"
            f"Target ~{target_words} words. Structure: opening → evidence → methodology → closing. "
            "Do not include the section title."
        )
        async with self._client.messages.stream(
            model=self.model,
            max_tokens=1500,
            system="You are an expert proposal writer for government and enterprise RFPs. Write professional, evidence-based responses that directly address requirements.",
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def score_quality(self, draft: str, requirement: str) -> Dict[str, Any]:
        message = await self._client.messages.create(
            model=self.model,
            max_tokens=512,
            system=SCORE_SYSTEM,
            messages=[{"role": "user", "content": f"Requirement:\n{requirement}\n\nDraft:\n{draft[:3000]}"}],
        )
        raw = message.content[0].text.strip()
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
        gaps_text = "\n".join(f"- {g}" for g in gaps[:10]) if gaps else "None identified"
        win_rate = sum(1 for b in history if b.get("outcome") == "win") / max(len(history), 1) * 100
        history_summary = f"{len(history)} historical bids, win rate: {win_rate:.0f}%" if history else "No history"

        prompt = (
            f"Win Score: {win_score:.1f}/100\n"
            f"Sector: {sector or 'Unknown'}\n"
            f"Compliance Gaps:\n{gaps_text}\n"
            f"Bid History: {history_summary}\n\n"
            "Generate a GO/NO-GO recommendation."
        )
        message = await self._client.messages.create(
            model=self.model,
            max_tokens=300,
            system=DECISION_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
