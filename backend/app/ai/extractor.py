from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers.base import AIProvider
from app.ai.providers.registry import get_system_provider
from app.config import settings
from app.db.models import DocumentStatus, Requirement, RfpDocument
from app.logger import get_logger

logger = get_logger("extractor")


class RFPExtractor:
    def __init__(self, provider: Optional[AIProvider] = None) -> None:
        self.provider = provider or get_system_provider("extractor")

    async def extract_and_save(
        self,
        document_id: UUID,
        session: AsyncSession,
        progress_callback=None,
    ) -> List[Requirement]:
        doc = await session.get(RfpDocument, document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")
        if not doc.extracted_text:
            raise ValueError(f"Document {document_id} has no extracted text")

        if progress_callback:
            await progress_callback(10)

        logger.info("Starting AI extraction", document_id=str(document_id), provider=self.provider.provider_name)

        extracted: Dict[str, Any] = await self.provider.extract_requirements(doc.extracted_text)

        if progress_callback:
            await progress_callback(60)

        requirements: List[Requirement] = []
        mandatory_reqs = extracted.get("mandatory_requirements", [])
        eval_criteria = extracted.get("evaluation_criteria", [])
        deadlines = extracted.get("deadlines", [])
        budget = extracted.get("budget", "")
        qa_sections = extracted.get("qa_sections", [])

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

        doc.status = DocumentStatus.DONE
        session.add(doc)
        await session.commit()

        if progress_callback:
            await progress_callback(100)

        logger.info("Extraction complete", document_id=str(document_id), n_requirements=len(requirements))
        return requirements
