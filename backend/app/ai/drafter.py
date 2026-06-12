import json
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.ai.providers.base import AIProvider
from app.ai.providers.registry import get_system_provider
from app.config import settings
from app.db.models import (
    Capability,
    ComplianceItem,
    ComplianceStatus,
    Organization,
    Proposal,
    ProposalActivityLog,
    ProposalDocument,
    ProposalStatus,
    ProposalVersion,
    Requirement,
    ReviewAction,
    Workspace,
)
from app.logger import get_logger

logger = get_logger("drafter")


class ProposalDrafter:
    def __init__(self, provider: Optional[AIProvider] = None) -> None:
        self.provider = provider or get_system_provider("drafter")

    async def draft_section_stream(
        self,
        requirement: Requirement,
        capabilities: List[Dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        """Stream SSE events for a single section draft."""
        section_title = requirement.category or "Proposal Section"
        yield f"data: {json.dumps({'event': 'start', 'section_title': section_title})}\n\n"

        full_text = []
        async for chunk in self.provider.draft_section(
            requirement=requirement.text,
            capabilities=capabilities,
            section_title=section_title,
            target_words=settings.PROPOSAL_TARGET_WORDS,
        ):
            full_text.append(chunk)
            yield f"data: {json.dumps({'event': 'chunk', 'text': chunk})}\n\n"

        yield f"data: {json.dumps({'event': 'done', 'word_count': len(''.join(full_text).split())})}\n\n"

    async def draft_and_save(
        self,
        requirement_id: UUID,
        workspace_id: UUID,
        session: AsyncSession,
        progress_callback=None,
    ) -> Proposal:
        """Draft a single section and persist to DB."""
        requirement = await session.get(Requirement, requirement_id)
        if not requirement:
            raise ValueError(f"Requirement {requirement_id} not found")

        # Load top matched capabilities for this requirement
        comp_result = await session.execute(
            select(ComplianceItem)
            .where(
                ComplianceItem.requirement_id == requirement_id,
                ComplianceItem.workspace_id == workspace_id,
                ComplianceItem.status != ComplianceStatus.GAP,
            )
            .order_by(ComplianceItem.match_score.desc())
        )
        compliance_items = comp_result.scalars().all()

        capabilities: List[Dict[str, Any]] = []
        for item in compliance_items[:3]:
            if item.capability_id:
                cap = await session.get(Capability, item.capability_id)
                if cap:
                    capabilities.append({
                        "title": cap.title,
                        "description": cap.description,
                        "score": item.match_score or 0.0,
                        "domain": cap.domain,
                        "certification": cap.certification,
                    })

        # Collect draft text from stream
        parts = []
        async for chunk in self.provider.draft_section(
            requirement=requirement.text,
            capabilities=capabilities,
            section_title=requirement.category or "Proposal Section",
            target_words=settings.PROPOSAL_TARGET_WORDS,
        ):
            parts.append(chunk)

        draft_text = "".join(parts)
        word_count = len(draft_text.split())

        if progress_callback:
            await progress_callback(80)

        # Upsert proposal
        existing_result = await session.execute(
            select(Proposal).where(
                Proposal.requirement_id == requirement_id,
                Proposal.workspace_id == workspace_id,
            )
        )
        existing = existing_result.scalars().first()

        if existing:
            # Save previous version before overwriting
            ver_result = await session.execute(
                select(ProposalVersion)
                .where(ProposalVersion.proposal_id == existing.id)
                .order_by(ProposalVersion.version_num.desc())
            )
            latest = ver_result.scalars().first()
            next_num = (latest.version_num + 1) if latest else 1

            session.add(ProposalVersion(
                proposal_id=existing.id,
                content=existing.current_content or existing.ai_draft or "",
                version_num=next_num,
            ))
            existing.ai_draft = draft_text
            existing.current_content = draft_text
            existing.word_count = word_count
            existing.status = ProposalStatus.PENDING
            existing.ai_provider_used = self.provider.provider_name
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            proposal = existing
        else:
            proposal = Proposal(
                workspace_id=workspace_id,
                requirement_id=requirement_id,
                section_title=requirement.category or "Proposal Section",
                section_number=requirement.section_number,
                ai_draft=draft_text,
                current_content=draft_text,
                word_count=word_count,
                target_word_count=settings.PROPOSAL_TARGET_WORDS,
                status=ProposalStatus.PENDING,
                ai_provider_used=self.provider.provider_name,
                sort_order=requirement.sort_order,
            )
            session.add(proposal)

        await session.flush()
        await session.refresh(proposal)
        logger.info("Section drafted", proposal_id=str(proposal.id), words=word_count)
        return proposal

    async def draft_full_document(
        self,
        workspace_id: UUID,
        session: AsyncSession,
        target_words_per_section: int = 400,
        progress_callback=None,
    ) -> ProposalDocument:
        """
        Auto-draft a complete structured proposal response document.

        Maps AI-generated content to each RFP section/question in document order,
        assembles a cover page and executive summary, and saves everything to DB.
        """
        workspace = await session.get(Workspace, workspace_id)
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # Load org context
        org = await session.get(Organization, workspace.org_id)
        org_context = {
            "org_name": org.name if org else "Our Organization",
            "sector": workspace.sector or "",
            "deadline": workspace.deadline.strftime("%B %d, %Y") if workspace.deadline else "TBD",
            "budget": f"${workspace.budget:,.0f}" if workspace.budget else "As per RFP",
        }

        # Load requirements in document order
        req_result = await session.execute(
            select(Requirement)
            .where(Requirement.workspace_id == workspace_id)
            .order_by(Requirement.sort_order.asc(), Requirement.created_at.asc())
        )
        requirements = req_result.scalars().all()

        if not requirements:
            raise ValueError("No requirements found — upload and process an RFP document first")

        if progress_callback:
            await progress_callback(5)

        # Build sections payload with matched capabilities
        sections_payload = []
        for req in requirements:
            comp_result = await session.execute(
                select(ComplianceItem)
                .where(
                    ComplianceItem.requirement_id == req.id,
                    ComplianceItem.workspace_id == workspace_id,
                    ComplianceItem.status != ComplianceStatus.GAP,
                )
                .order_by(ComplianceItem.match_score.desc())
            )
            items = comp_result.scalars().all()

            caps = []
            for item in items[:3]:
                if item.capability_id:
                    cap = await session.get(Capability, item.capability_id)
                    if cap:
                        caps.append({
                            "title": cap.title,
                            "description": cap.description,
                            "score": item.match_score or 0.0,
                        })

            sections_payload.append({
                "requirement_id": str(req.id),
                "section_number": req.section_number or "",
                "section_title": req.category or "Section",
                "requirement_text": req.text,
                "capabilities": caps,
                "is_mandatory": req.is_mandatory,
            })

        if progress_callback:
            await progress_callback(15)

        # Call AI to draft everything
        logger.info("Starting full document draft", workspace_id=str(workspace_id), n_sections=len(sections_payload))
        result = await self.provider.draft_full_document(
            sections=sections_payload,
            org_context=org_context,
            target_words_per_section=target_words_per_section,
        )

        if progress_callback:
            await progress_callback(75)

        # Persist each section as a Proposal row
        import json as _json
        structure = []
        for drafted in result["sections"]:
            req_id = UUID(drafted["requirement_id"]) if drafted.get("requirement_id") else None
            if not req_id:
                continue

            existing_result = await session.execute(
                select(Proposal).where(
                    Proposal.requirement_id == req_id,
                    Proposal.workspace_id == workspace_id,
                )
            )
            existing = existing_result.scalars().first()

            if existing:
                ver_result = await session.execute(
                    select(ProposalVersion)
                    .where(ProposalVersion.proposal_id == existing.id)
                    .order_by(ProposalVersion.version_num.desc())
                )
                latest = ver_result.scalars().first()
                session.add(ProposalVersion(
                    proposal_id=existing.id,
                    content=existing.current_content or "",
                    version_num=(latest.version_num + 1) if latest else 1,
                    change_summary="Re-drafted as part of full document generation",
                ))
                existing.ai_draft = drafted["content"]
                existing.current_content = drafted["content"]
                existing.word_count = drafted["word_count"]
                existing.target_word_count = target_words_per_section
                existing.status = ProposalStatus.PENDING
                existing.ai_provider_used = self.provider.provider_name
                existing.updated_at = datetime.utcnow()
                session.add(existing)
                proposal_id = str(existing.id)
            else:
                req_obj = await session.get(Requirement, req_id)
                proposal = Proposal(
                    workspace_id=workspace_id,
                    requirement_id=req_id,
                    section_title=drafted["section_title"],
                    section_number=drafted["section_number"],
                    ai_draft=drafted["content"],
                    current_content=drafted["content"],
                    word_count=drafted["word_count"],
                    target_word_count=target_words_per_section,
                    status=ProposalStatus.PENDING,
                    ai_provider_used=self.provider.provider_name,
                    sort_order=req_obj.sort_order if req_obj else 0,
                )
                session.add(proposal)
                await session.flush()
                await session.refresh(proposal)
                proposal_id = str(proposal.id)

            structure.append({
                "section_number": drafted["section_number"],
                "section_title": drafted["section_title"],
                "requirement_id": str(req_id),
                "proposal_id": proposal_id,
                "word_count": drafted["word_count"],
            })

        if progress_callback:
            await progress_callback(90)

        # Create or update the ProposalDocument record
        existing_doc_result = await session.execute(
            select(ProposalDocument).where(ProposalDocument.workspace_id == workspace_id)
        )
        existing_doc = existing_doc_result.scalars().first()

        if existing_doc:
            existing_doc.title = f"{workspace.name} — Proposal Response"
            existing_doc.cover_page = result["cover_page"]
            existing_doc.executive_summary = result["executive_summary"]
            existing_doc.structure = _json.dumps(structure)
            existing_doc.total_word_count = result["total_word_count"]
            existing_doc.total_sections = len(structure)
            existing_doc.approved_sections = 0
            existing_doc.completion_pct = 0.0
            existing_doc.ai_provider_used = self.provider.provider_name
            existing_doc.status = "draft"
            existing_doc.updated_at = datetime.utcnow()
            session.add(existing_doc)
            doc = existing_doc
        else:
            doc = ProposalDocument(
                workspace_id=workspace_id,
                title=f"{workspace.name} — Proposal Response",
                cover_page=result["cover_page"],
                executive_summary=result["executive_summary"],
                structure=_json.dumps(structure),
                total_word_count=result["total_word_count"],
                total_sections=len(structure),
                ai_provider_used=self.provider.provider_name,
                status="draft",
            )
            session.add(doc)

        await session.flush()
        await session.refresh(doc)

        if progress_callback:
            await progress_callback(100)

        logger.info(
            "Full document drafted",
            workspace_id=str(workspace_id),
            sections=len(structure),
            total_words=result["total_word_count"],
        )
        return doc
