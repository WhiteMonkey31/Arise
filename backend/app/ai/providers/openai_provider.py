import json
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from app.ai.providers.base import AIProvider
from app.config import settings
from app.logger import get_logger

logger = get_logger("openai_provider")


class OpenAIProvider(AIProvider):
    provider_name = "openai"

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None, base_url: Optional[str] = None) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key or settings.OPENAI_API_KEY,
            base_url=base_url or None,
        )
        self.model = model_name or settings.OPENAI_MODEL

    async def extract_requirements(self, text: str) -> Dict[str, Any]:
        truncated = text[:120_000]
        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=4096,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert RFP analyst. Extract structured information and return valid JSON with keys: "
                        "mandatory_requirements (list), evaluation_criteria (list), deadlines (list), "
                        "budget (string or null), qa_sections (list)."
                    ),
                },
                {"role": "user", "content": f"Extract requirements from this RFP:\n\n{truncated}"},
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
                {"role": "system", "content": "You are an expert proposal writer for government and enterprise RFPs."},
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
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Score the proposal draft on: compliance_coverage (0-1), clarity (0-1), "
                        "evidence_strength (0-1), word_count_fit (0-1). Compute overall average. "
                        "badge: Excellent (>=0.80), Good (0.60-0.79), Needs Work (<0.60). "
                        "Return JSON with all keys plus 'feedback' (one sentence)."
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
        gaps_text = "\n".join(f"- {g}" for g in gaps[:10]) or "None identified"
        win_rate = sum(1 for b in history if b.get("outcome") == "win") / max(len(history), 1) * 100
        response = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=300,
            messages=[
                {"role": "system", "content": "Strategic bid advisor. Exactly 3 sentences: 1) GO/NO-GO + confidence, 2) top 2 risks, 3) key factor."},
                {"role": "user", "content": f"Win Score: {win_score:.1f}/100\nSector: {sector}\nHistorical win rate: {win_rate:.0f}%\nGaps:\n{gaps_text}"},
            ],
        )
        return response.choices[0].message.content or ""

    async def draft_full_document(
        self,
        sections: List[Dict[str, Any]],
        org_context: Dict[str, Any],
        target_words_per_section: int = 400,
    ) -> Dict[str, Any]:
        org_name = org_context.get("org_name", "Our Organization")
        sector = org_context.get("sector", "")
        deadline = org_context.get("deadline", "TBD")

        # Cover page
        cover_resp = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=600,
            messages=[
                {"role": "system", "content": "You are a professional proposal writer."},
                {"role": "user", "content": (
                    f"Write a formal proposal cover page narrative (2-3 paragraphs) for:\n"
                    f"Organization: {org_name}\nSector: {sector}\nDeadline: {deadline}\n"
                    "Cover intent to respond, commitment to quality, and key differentiators."
                )},
            ],
        )
        cover_page = cover_resp.choices[0].message.content or ""

        # Executive summary
        section_titles = [s.get("section_title", "") for s in sections[:10]]
        exec_resp = await self._client.chat.completions.create(
            model=self.model,
            max_tokens=800,
            messages=[
                {"role": "system", "content": "You are a professional proposal writer."},
                {"role": "user", "content": (
                    f"Write an executive summary (3-4 paragraphs) for a proposal from {org_name} "
                    f"for a {sector} procurement. Key areas:\n"
                    + "\n".join(f"- {t}" for t in section_titles)
                )},
            ],
        )
        executive_summary = exec_resp.choices[0].message.content or ""

        drafted_sections = []
        total_words = len(cover_page.split()) + len(executive_summary.split())

        for section in sections:
            req_text = section.get("requirement_text", "")
            section_title = section.get("section_title", "Response")
            section_number = section.get("section_number", "")
            capabilities = section.get("capabilities", [])

            cap_text = "\n".join(
                f"- [{c.get('score', 0):.2f}] {c.get('title', '')}: {c.get('description', '')[:250]}"
                for c in capabilities[:3]
            ) or "Respond from general organizational capabilities."

            sec_resp = await self._client.chat.completions.create(
                model=self.model,
                max_tokens=1200,
                messages=[
                    {"role": "system", "content": "Expert proposal writer. Direct, evidence-based, professional responses."},
                    {"role": "user", "content": (
                        f"Proposal section {section_number}: {section_title}\n\n"
                        f"Requirement:\n{req_text}\n\n"
                        f"Evidence:\n{cap_text}\n\n"
                        f"~{target_words_per_section} words. Direct answer → evidence → approach → commitment."
                    )},
                ],
            )
            content = sec_resp.choices[0].message.content or ""
            word_count = len(content.split())
            total_words += word_count

            drafted_sections.append({
                "section_number": section_number,
                "section_title": section_title,
                "requirement_id": section.get("requirement_id"),
                "content": content,
                "word_count": word_count,
            })

        return {
            "cover_page": cover_page,
            "executive_summary": executive_summary,
            "sections": drafted_sections,
            "total_word_count": total_words,
        }
