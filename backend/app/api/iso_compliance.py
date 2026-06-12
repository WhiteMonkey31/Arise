"""
ISO/IEC standard lookup and compliance verification.

Uses the ISO Online Browsing Platform (OBP) public API where available,
plus a local curated list of common standards for offline fallback.

ISO OBP API docs: https://www.iso.org/obp/api
"""
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.config import settings
from app.db.database import get_session
from app.db.models import ComplianceItem, Requirement, User
from app.logger import get_logger

logger = get_logger("iso_compliance")
router = APIRouter(prefix="/api/iso", tags=["iso-compliance"])

# Well-known standards relevant to RFP/government procurement
# Used as fallback when ISO API is unavailable
KNOWN_STANDARDS: Dict[str, Dict[str, Any]] = {
    "ISO 9001": {
        "standard": "ISO 9001",
        "title": "Quality management systems — Requirements",
        "edition": "2015",
        "field": "Quality Management",
        "description": "Specifies requirements for a quality management system when an organization needs to demonstrate its ability to consistently provide products and services that meet customer and regulatory requirements.",
        "url": "https://www.iso.org/standard/62085.html",
    },
    "ISO 27001": {
        "standard": "ISO/IEC 27001",
        "title": "Information security, cybersecurity and privacy protection — Information security management systems — Requirements",
        "edition": "2022",
        "field": "Information Security",
        "description": "Specifies requirements for establishing, implementing, maintaining and continually improving an information security management system.",
        "url": "https://www.iso.org/standard/27001",
    },
    "ISO 27001:2022": {
        "standard": "ISO/IEC 27001:2022",
        "title": "Information security management systems — Requirements",
        "edition": "2022",
        "field": "Information Security",
        "description": "Latest edition of the ISMS standard.",
        "url": "https://www.iso.org/standard/27001",
    },
    "ISO 14001": {
        "standard": "ISO 14001",
        "title": "Environmental management systems — Requirements with guidance for use",
        "edition": "2015",
        "field": "Environmental Management",
        "description": "Specifies requirements for an environmental management system that an organization can use to enhance its environmental performance.",
        "url": "https://www.iso.org/standard/60857.html",
    },
    "ISO 45001": {
        "standard": "ISO 45001",
        "title": "Occupational health and safety management systems — Requirements with guidance for use",
        "edition": "2018",
        "field": "Occupational Health & Safety",
        "description": "Specifies requirements for an occupational health and safety management system.",
        "url": "https://www.iso.org/standard/63787.html",
    },
    "ISO 20000": {
        "standard": "ISO/IEC 20000-1",
        "title": "Information technology — Service management — Part 1: Service management system requirements",
        "edition": "2018",
        "field": "IT Service Management",
        "description": "Specifies requirements for an organization to establish, implement, maintain and continually improve a service management system (SMS).",
        "url": "https://www.iso.org/standard/70636.html",
    },
    "ISO 22301": {
        "standard": "ISO 22301",
        "title": "Security and resilience — Business continuity management systems — Requirements",
        "edition": "2019",
        "field": "Business Continuity",
        "description": "Specifies requirements to plan, establish, implement, operate, monitor, review, maintain and continually improve a business continuity management system.",
        "url": "https://www.iso.org/standard/75106.html",
    },
    "ISO 37001": {
        "standard": "ISO 37001",
        "title": "Anti-bribery management systems — Requirements with guidance for use",
        "edition": "2016",
        "field": "Anti-Bribery",
        "description": "Specifies requirements and provides guidance for establishing, implementing, maintaining, reviewing and improving an anti-bribery management system.",
        "url": "https://www.iso.org/standard/65034.html",
    },
    "ISO 50001": {
        "standard": "ISO 50001",
        "title": "Energy management systems — Requirements with guidance for use",
        "edition": "2018",
        "field": "Energy Management",
        "description": "Specifies requirements for establishing, implementing, maintaining and improving an energy management system.",
        "url": "https://www.iso.org/standard/69426.html",
    },
}


class ISOStandardResponse(BaseModel):
    standard: str
    title: str
    edition: str
    field: str
    description: str
    url: Optional[str] = None
    source: str = "local"


class ComplianceCheckResult(BaseModel):
    requirement_id: UUID
    requirement_text: str
    detected_standard: Optional[str]
    standard_info: Optional[ISOStandardResponse]
    is_verified: bool
    notes: Optional[str]


class VerifyRequest(BaseModel):
    standard: str  # e.g. "ISO 9001" or "ISO 27001"
    compliance_item_id: UUID
    clause: Optional[str] = None  # e.g. "4.2", "6.1"


async def _fetch_from_iso_api(query: str) -> Optional[Dict[str, Any]]:
    """Try to fetch standard info from ISO OBP API."""
    if not settings.ISO_API_BASE_URL:
        return None
    try:
        headers = {}
        if settings.ISO_API_KEY:
            headers["Authorization"] = f"Bearer {settings.ISO_API_KEY}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.ISO_API_BASE_URL}/standard",
                params={"q": query, "format": "json"},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                # OBP returns an array of results
                results = data.get("results", [])
                if results:
                    r = results[0]
                    return {
                        "standard": r.get("reference", query),
                        "title": r.get("title", ""),
                        "edition": r.get("publicationDate", "")[:4] if r.get("publicationDate") else "",
                        "field": r.get("ics", [{}])[0].get("code", "") if r.get("ics") else "",
                        "description": r.get("abstract", ""),
                        "url": r.get("obpUrl", ""),
                        "source": "iso_api",
                    }
    except Exception as exc:
        logger.warning("ISO API lookup failed", query=query, error=str(exc))
    return None


def _lookup_local(standard: str) -> Optional[Dict[str, Any]]:
    """Check local known standards dict (case-insensitive)."""
    normalized = standard.upper().strip()
    for key, val in KNOWN_STANDARDS.items():
        if normalized in key.upper() or key.upper() in normalized:
            return {**val, "source": "local"}
    return None


@router.get("/standards/search", response_model=List[ISOStandardResponse])
async def search_standards(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(current_active_user),
):
    """Search for ISO standards by keyword or number."""
    results = []

    # Local match first (instant)
    for key, val in KNOWN_STANDARDS.items():
        if q.lower() in key.lower() or q.lower() in val["title"].lower() or q.lower() in val["field"].lower():
            results.append(ISOStandardResponse(**val, source="local"))

    # Try ISO API for additional results
    api_result = await _fetch_from_iso_api(q)
    if api_result:
        already = any(r.standard == api_result["standard"] for r in results)
        if not already:
            results.append(ISOStandardResponse(**api_result))

    if not results:
        raise HTTPException(status_code=404, detail=f"No standards found for '{q}'")

    return results


@router.get("/standards/{standard_ref}", response_model=ISOStandardResponse)
async def get_standard(
    standard_ref: str,
    current_user: User = Depends(current_active_user),
):
    """Get details of a specific ISO standard."""
    local = _lookup_local(standard_ref)
    if local:
        return ISOStandardResponse(**local)

    api_result = await _fetch_from_iso_api(standard_ref)
    if api_result:
        return ISOStandardResponse(**api_result)

    raise HTTPException(status_code=404, detail=f"Standard '{standard_ref}' not found")


@router.post("/verify", response_model=ComplianceCheckResult)
async def verify_compliance_item(
    payload: VerifyRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """
    Mark a compliance item as ISO-verified and attach the standard info.
    Fetches standard details from ISO API / local fallback.
    """
    item = await session.get(ComplianceItem, payload.compliance_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")

    req = await session.get(Requirement, item.requirement_id)

    # Lookup standard
    standard_info = _lookup_local(payload.standard)
    if not standard_info:
        standard_info = await _fetch_from_iso_api(payload.standard)

    if not standard_info:
        raise HTTPException(status_code=404, detail=f"Standard '{payload.standard}' not found. Try /api/iso/standards/search?q={payload.standard}")

    # Update compliance item
    item.iso_verified = True
    item.iso_standard = standard_info["standard"]
    item.iso_clause = payload.clause
    item.notes = f"Verified against {standard_info['standard']}" + (f" clause {payload.clause}" if payload.clause else "")
    session.add(item)

    # Also update requirement
    if req:
        req.iso_standard = standard_info["standard"]
        req.compliance_ref = payload.clause or standard_info.get("url", "")
        session.add(req)

    await session.commit()

    logger.info("ISO compliance verified", item_id=str(payload.compliance_item_id), standard=standard_info["standard"])

    return ComplianceCheckResult(
        requirement_id=item.requirement_id,
        requirement_text=req.text if req else "",
        detected_standard=standard_info["standard"],
        standard_info=ISOStandardResponse(**standard_info),
        is_verified=True,
        notes=item.notes,
    )


@router.get("/workspace/{workspace_id}/scan", response_model=List[ComplianceCheckResult])
async def scan_workspace_for_standards(
    workspace_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """
    Auto-scan all requirements in a workspace for ISO standard mentions
    and return a list of detected references with standard info.
    """
    import re

    result = await session.execute(
        select(Requirement).where(Requirement.workspace_id == workspace_id)
    )
    requirements = result.scalars().all()

    # Pattern matches things like "ISO 9001", "ISO/IEC 27001", "ISO 9001:2015"
    iso_pattern = re.compile(r"ISO(?:/IEC)?\s*[\d]+(?:[-:]\d+)?", re.IGNORECASE)

    findings: List[ComplianceCheckResult] = []
    for req in requirements:
        matches = iso_pattern.findall(req.text)
        if matches:
            detected = matches[0].strip()
            standard_info = _lookup_local(detected)
            if not standard_info:
                standard_info = await _fetch_from_iso_api(detected)

            findings.append(ComplianceCheckResult(
                requirement_id=req.id,
                requirement_text=req.text[:300],
                detected_standard=detected if standard_info else None,
                standard_info=ISOStandardResponse(**standard_info) if standard_info else None,
                is_verified=False,
                notes=f"Detected reference to {detected}" if standard_info else f"Referenced {detected} but standard not found",
            ))

    return findings
