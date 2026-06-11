"""Proposal section drafter with SSE streaming support."""

import json
from typing import AsyncGenerator, Dict, Any, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.ai.providers.base import AIProvider
from app.ai.providers.claude import ClaudeProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.config import settings
from app.db.models import (
    ComplianceItem,
    ComplianceStatus,
    Proposal,
    ProposalStatus,
    ProposalVersion,
    Requirement,
    Capability,
)
from app.logger import get_logger

logger = get_logger("drafter")


def get_drafting_provider() -> AIProvider:
    """Return the configured drafting AI provider."""
    if settings.DRAFTER_PROVIDER == "openai":
        return OpenAIProvider()
    return ClaudeProvider()


class ProposalDrafter:
    """Drafts proposal sections using RAG-matched capabilities."""

    def __init__(self, provider: AIProvider = None) -> None:
        self.provider = provider or get_drafting_provider()

    async def draft_section_stream(
        self,
        requirement: Requirement,
        capabilities: List[Dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        """Stream a draft proposal section as SSE-compatible text chunks.

        Args:
            requirement: The Requirement ORM object.
            capabilities: List of capability dicts with title, description, score.

        Yields:
            SSE-formatted event strings.
        """
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

        complete_draft = "".join(full_text)
        word_count = len(complete_draft.split())

        yield f"data: {json.dumps({'event': 'done', 'word_count': word_count})}\n\n"

    async def draft_and_save(
        self,
        requirement_id: UUID,
        workspace_id: UUID,
        session: AsyncSession,
        progress_callback=None,
    ) -> Proposal:
        """Draft a section and persist to the proposals table.

        Args:
            requirement_id: UUID of the requirement.
            workspace_id: UUID of the workspace.
            session: Active async DB session.
            progress_callback: Optional async callable(pct: int).

        Returns:
            Created or updated Proposal ORM object.
        """
        # Load requirement
        requirement = await session.get(Requirement, requirement_id)
        if not requirement:
            raise ValueError(f"Requirement {requirement_id} not found")

        # Load best compliance item for this requirement
        stmt = (
            select(ComplianceItem)
            .where(
                ComplianceItem.requirement_id == requirement_id,
                ComplianceItem.workspace_id == workspace_id,
                ComplianceItem.status != ComplianceStatus.GAP,
            )
            .order_by(ComplianceItem.match_score.desc())
        )
        result = await session.execute(stmt)
        compliance_items = result.scalars().all()

        # Build capabilities list
        capabilities: List[Dict[str, Any]] = []
        for item in compliance_items[:3]:
            if item.capability_id:
                cap = await session.get(Capability, item.capability_id)
                if cap:
                    capabilities.append(
                        {
                            "title": cap.title,
                            "description": cap.description,
                            "score": item.match_score or 0.0,
                            "domain": cap.domain,
                            "certification": cap.certification,
                        }
                    )

        # Stream draft
        full_text_parts = []
        async for chunk in self.provider.draft_section(
            requirement=requirement.text,
            capabilities=capabilities,
            section_title=requirement.category or "Proposal Section",
            target_words=settings.PROPOSAL_TARGET_WORDS,
        ):
            full_text_parts.append(chunk)

        draft_text = "".join(full_text_parts)
        word_count = len(draft_text.split())

        if progress_callback:
            await progress_callback(80)

        # Check if proposal already exists
        stmt = select(Proposal).where(
            Proposal.requirement_id == requirement_id,
            Proposal.workspace_id == workspace_id,
        )
        result = await session.execute(stmt)
        existing = result.scalars().first()

        if existing:
            # Save version history
            version = ProposalVersion(
                proposal_id=existing.id,
                content=existing.current_content or existing.ai_draft or "",
                version_num=(len(existing.versions) + 1) if existing.versions else 1,
            )
            session.add(version)

            existing.ai_draft = draft_text
            existing.current_content = draft_text
            existing.word_count = word_count
            existing.status = ProposalStatus.PENDING
            session.add(existing)
            proposal = existing
        else:
            proposal = Proposal(
                workspace_id=workspace_id,
                requirement_id=requirement_id,
                section_title=requirement.category or "Proposal Section",
                ai_draft=draft_text,
                current_content=draft_text,
                word_count=word_count,
                status=ProposalStatus.PENDING,
            )
            session.add(proposal)

        await session.flush()
        await session.refresh(proposal)

        logger.info(
            "Proposal section drafted",
            proposal_id=str(proposal.id),
            word_count=word_count,
        )
        return proposal
