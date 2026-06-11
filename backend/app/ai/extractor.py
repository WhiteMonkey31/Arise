"""RFP extraction pipeline: text → structured requirements → DB."""

from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.ai.providers.base import AIProvider
from app.ai.providers.claude import ClaudeProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.config import settings
from app.db.models import Requirement, RfpDocument, DocumentStatus
from app.logger import get_logger

logger = get_logger("extractor")


def get_extraction_provider() -> AIProvider:
    """Return the configured extraction AI provider."""
    if settings.EXTRACTOR_PROVIDER == "openai":
        return OpenAIProvider()
    return ClaudeProvider()


class RFPExtractor:
    """Orchestrates full RFP extraction: parse text → AI extraction → DB save."""

    def __init__(self, provider: AIProvider = None) -> None:
        self.provider = provider or get_extraction_provider()

    async def extract_and_save(
        self,
        document_id: UUID,
        session: AsyncSession,
        progress_callback=None,
    ) -> List[Requirement]:
        """Run extraction on a document and persist requirements.

        Args:
            document_id: UUID of the RfpDocument to process.
            session: Active async DB session.
            progress_callback: Optional async callable(pct: int) for progress updates.

        Returns:
            List of created Requirement instances.
        """
        # Load document
        doc = await session.get(RfpDocument, document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")
        if not doc.extracted_text:
            raise ValueError(f"Document {document_id} has no extracted text")

        if progress_callback:
            await progress_callback(10)

        logger.info("Starting AI extraction", document_id=str(document_id))

        # Run AI extraction
        extracted: Dict[str, Any] = await self.provider.extract_requirements(doc.extracted_text)

        if progress_callback:
            await progress_callback(60)

        # Build requirement objects
        requirements: List[Requirement] = []
        mandatory_reqs: List[str] = extracted.get("mandatory_requirements", [])
        eval_criteria: List[str] = extracted.get("evaluation_criteria", [])
        deadlines: List[str] = extracted.get("deadlines", [])
        budget: str = extracted.get("budget", "")
        qa_sections: List[str] = extracted.get("qa_sections", [])

        # Create mandatory requirements
        for req_text in mandatory_reqs:
            if not req_text.strip():
                continue
            req = Requirement(
                rfp_document_id=document_id,
                workspace_id=doc.workspace_id,
                text=req_text.strip(),
                category="Mandatory",
                is_mandatory=True,
                deadline_ref=", ".join(deadlines[:3]) if deadlines else None,
                budget_ref=budget or None,
            )
            session.add(req)
            requirements.append(req)

        # Create evaluation criteria as non-mandatory requirements
        for crit_text in eval_criteria:
            if not crit_text.strip():
                continue
            req = Requirement(
                rfp_document_id=document_id,
                workspace_id=doc.workspace_id,
                text=crit_text.strip(),
                category="Evaluation Criterion",
                is_mandatory=False,
                evaluation_criteria=crit_text.strip(),
            )
            session.add(req)
            requirements.append(req)

        # Create Q&A sections as requirements
        for qa_text in qa_sections:
            if not qa_text.strip():
                continue
            req = Requirement(
                rfp_document_id=document_id,
                workspace_id=doc.workspace_id,
                text=qa_text.strip(),
                category="Q&A Section",
                is_mandatory=True,
            )
            session.add(req)
            requirements.append(req)

        if progress_callback:
            await progress_callback(90)

        await session.flush()

        # Update document status
        doc.status = DocumentStatus.DONE
        session.add(doc)
        await session.commit()

        if progress_callback:
            await progress_callback(100)

        logger.info(
            "Extraction complete",
            document_id=str(document_id),
            n_requirements=len(requirements),
        )
        return requirements

    async def get_extracted_data(
        self,
        document_id: UUID,
        session: AsyncSession,
    ) -> Dict[str, Any]:
        """Return raw structured extraction for a document (re-runs AI).

        Args:
            document_id: Document UUID.
            session: Async session.

        Returns:
            Raw extraction dict.
        """
        doc = await session.get(RfpDocument, document_id)
        if not doc or not doc.extracted_text:
            return {}
        return await self.provider.extract_requirements(doc.extracted_text)
