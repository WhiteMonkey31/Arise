"""Capabilities CRUD and ChromaDB embedding management."""

import io
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import Capability, User
from app.logger import get_logger
from app.rag.embedder import embedder
from app.rag.vectorstore import vector_store

logger = get_logger("capabilities_api")
router = APIRouter(prefix="/api/capabilities", tags=["capabilities"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CapabilityCreate(BaseModel):
    title: str
    description: str
    domain: Optional[str] = None
    certification: Optional[str] = None
    year: Optional[int] = None
    client_type: Optional[str] = None


class CapabilityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    certification: Optional[str] = None
    year: Optional[int] = None
    client_type: Optional[str] = None


class CapabilityResponse(BaseModel):
    id: UUID
    org_id: UUID
    title: str
    description: str
    domain: Optional[str]
    certification: Optional[str]
    year: Optional[int]
    client_type: Optional[str]
    embedding_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ImportResponse(BaseModel):
    created: int
    failed: int
    errors: List[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[CapabilityResponse])
async def list_capabilities(
    domain: Optional[str] = Query(default=None),
    certification: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> List[CapabilityResponse]:
    """List capabilities with optional filters."""
    stmt = select(Capability).where(Capability.org_id == current_user.org_id)

    if domain:
        stmt = stmt.where(Capability.domain.ilike(f"%{domain}%"))
    if certification:
        stmt = stmt.where(Capability.certification.ilike(f"%{certification}%"))
    if year:
        stmt = stmt.where(Capability.year == year)
    if search:
        stmt = stmt.where(
            (Capability.title.ilike(f"%{search}%")) | (Capability.description.ilike(f"%{search}%"))
        )

    stmt = stmt.offset(offset).limit(limit).order_by(Capability.created_at.desc())
    result = await session.execute(stmt)
    caps = result.scalars().all()
    return [CapabilityResponse.model_validate(c) for c in caps]


@router.post("", response_model=CapabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_capability(
    payload: CapabilityCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> CapabilityResponse:
    """Create a capability, embed it, and store in ChromaDB."""
    cap = Capability(
        org_id=current_user.org_id,
        title=payload.title,
        description=payload.description,
        domain=payload.domain,
        certification=payload.certification,
        year=payload.year,
        client_type=payload.client_type,
    )
    session.add(cap)
    await session.flush()
    await session.refresh(cap)

    # Embed and store in ChromaDB
    combined_text = f"{cap.title}. {cap.description}"
    embedding = await embedder.embed_text(combined_text)

    vector_store.add_capability(
        capability_id=str(cap.id),
        text=combined_text,
        embedding=embedding,
        metadata={
            "org_id": str(cap.org_id),
            "domain": cap.domain or "",
            "certification": cap.certification or "",
            "year": cap.year or 0,
            "client_type": cap.client_type or "",
        },
    )
    cap.embedding_id = str(cap.id)
    session.add(cap)

    logger.info("Capability created and embedded", capability_id=str(cap.id))
    return CapabilityResponse.model_validate(cap)


@router.put("/{capability_id}", response_model=CapabilityResponse)
async def update_capability(
    capability_id: UUID,
    payload: CapabilityUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> CapabilityResponse:
    """Update a capability and re-embed in ChromaDB."""
    cap = await _get_owned_capability(capability_id, current_user, session)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cap, field, value)
    cap.updated_at = datetime.utcnow()
    session.add(cap)
    await session.flush()
    await session.refresh(cap)

    # Re-embed
    combined_text = f"{cap.title}. {cap.description}"
    embedding = await embedder.embed_text(combined_text)
    vector_store.update_capability(
        capability_id=str(cap.id),
        text=combined_text,
        embedding=embedding,
        metadata={
            "org_id": str(cap.org_id),
            "domain": cap.domain or "",
            "certification": cap.certification or "",
            "year": cap.year or 0,
            "client_type": cap.client_type or "",
        },
    )

    logger.info("Capability updated and re-embedded", capability_id=str(capability_id))
    return CapabilityResponse.model_validate(cap)


@router.delete("/{capability_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_capability(
    capability_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> None:
    """Delete a capability from DB and ChromaDB."""
    cap = await _get_owned_capability(capability_id, current_user, session)
    vector_store.delete_capability(str(cap.id))
    await session.delete(cap)
    logger.info("Capability deleted", capability_id=str(capability_id))


@router.post("/import", response_model=ImportResponse, status_code=status.HTTP_201_CREATED)
async def import_capabilities(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> ImportResponse:
    """Batch import capabilities from an XLSX file.

    Expected columns: title, description, domain, certification, year, client_type
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel (.xlsx/.xls) file")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse Excel file: {exc}")

    required_cols = {"title", "description"}
    if not required_cols.issubset(set(df.columns.str.lower())):
        raise HTTPException(
            status_code=400,
            detail=f"Excel must have columns: {required_cols}. Found: {list(df.columns)}",
        )

    df.columns = df.columns.str.lower()
    created = 0
    failed = 0
    errors: List[str] = []

    # Batch embed all descriptions
    texts = [
        f"{row.get('title', '')}. {row.get('description', '')}"
        for _, row in df.iterrows()
        if row.get("title") and row.get("description")
    ]

    try:
        embeddings = await embedder.embed_batch(texts)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    embedding_idx = 0
    for _, row in df.iterrows():
        try:
            title = str(row.get("title", "")).strip()
            description = str(row.get("description", "")).strip()
            if not title or not description:
                failed += 1
                errors.append(f"Row {_ + 2}: missing title or description")
                continue

            cap = Capability(
                org_id=current_user.org_id,
                title=title,
                description=description,
                domain=str(row["domain"]) if "domain" in row and pd.notna(row["domain"]) else None,
                certification=str(row["certification"]) if "certification" in row and pd.notna(row["certification"]) else None,
                year=int(row["year"]) if "year" in row and pd.notna(row["year"]) else None,
                client_type=str(row["client_type"]) if "client_type" in row and pd.notna(row["client_type"]) else None,
            )
            session.add(cap)
            await session.flush()
            await session.refresh(cap)

            # Store embedding
            cap.embedding_id = str(cap.id)
            session.add(cap)

            vector_store.add_capability(
                capability_id=str(cap.id),
                text=texts[embedding_idx],
                embedding=embeddings[embedding_idx],
                metadata={
                    "org_id": str(cap.org_id),
                    "domain": cap.domain or "",
                    "certification": cap.certification or "",
                    "year": cap.year or 0,
                },
            )
            embedding_idx += 1
            created += 1
        except Exception as exc:
            failed += 1
            errors.append(f"Row error: {exc}")

    logger.info("Capabilities imported", created=created, failed=failed)
    return ImportResponse(created=created, failed=failed, errors=errors)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_owned_capability(
    capability_id: UUID,
    user: User,
    session: AsyncSession,
) -> Capability:
    cap = await session.get(Capability, capability_id)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    if cap.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return cap
