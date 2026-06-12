from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import AIProviderConfig, User
from app.ai.providers.registry import encrypt_key
from app.logger import get_logger

logger = get_logger("ai_providers_api")
router = APIRouter(prefix="/api/ai-providers", tags=["ai-providers"])

SUPPORTED_TYPES = {"claude", "openai", "gemini", "grok", "custom"}


class ProviderCreate(BaseModel):
    name: str
    provider_type: str  # claude | openai | gemini | grok | custom
    api_key: str        # plain text — we encrypt before storing
    model_name: str
    base_url: Optional[str] = None
    is_default: bool = False


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None  # only update if provided
    model_name: Optional[str] = None
    base_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class ProviderResponse(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    provider_type: str
    model_name: str
    base_url: Optional[str]
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=List[ProviderResponse])
async def list_providers(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(AIProviderConfig).where(AIProviderConfig.org_id == current_user.org_id)
    )
    return [ProviderResponse.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=ProviderResponse, status_code=201)
async def create_provider(
    payload: ProviderCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    if payload.provider_type not in SUPPORTED_TYPES:
        raise HTTPException(status_code=400, detail=f"provider_type must be one of: {SUPPORTED_TYPES}")

    # If setting as default, unset existing default
    if payload.is_default:
        await _unset_defaults(current_user.org_id, session)

    config = AIProviderConfig(
        org_id=current_user.org_id,
        name=payload.name,
        provider_type=payload.provider_type,
        api_key_encrypted=encrypt_key(payload.api_key),
        model_name=payload.model_name,
        base_url=payload.base_url,
        is_default=payload.is_default,
    )
    session.add(config)
    await session.flush()
    await session.refresh(config)
    logger.info("AI provider created", org_id=str(current_user.org_id), type=payload.provider_type)
    return ProviderResponse.model_validate(config)


@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: UUID,
    payload: ProviderUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    config = await _get_owned(provider_id, current_user, session)

    if payload.name is not None:
        config.name = payload.name
    if payload.api_key is not None:
        config.api_key_encrypted = encrypt_key(payload.api_key)
    if payload.model_name is not None:
        config.model_name = payload.model_name
    if payload.base_url is not None:
        config.base_url = payload.base_url
    if payload.is_active is not None:
        config.is_active = payload.is_active
    if payload.is_default is not None:
        if payload.is_default:
            await _unset_defaults(current_user.org_id, session)
        config.is_default = payload.is_default

    config.updated_at = datetime.utcnow()
    session.add(config)
    await session.flush()
    await session.refresh(config)
    return ProviderResponse.model_validate(config)


@router.delete("/{provider_id}", status_code=204)
async def delete_provider(
    provider_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    config = await _get_owned(provider_id, current_user, session)
    await session.delete(config)
    logger.info("AI provider deleted", provider_id=str(provider_id))


@router.post("/{provider_id}/test")
async def test_provider(
    provider_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    """Send a minimal test prompt to verify the provider works."""
    from app.ai.providers.registry import get_provider_for_org
    try:
        provider = await get_provider_for_org(
            org_id=current_user.org_id,
            task="extractor",
            session=session,
            override_provider_id=provider_id,
        )
        # Simple test — just extract from a minimal string
        result = await provider.extract_requirements("This is a test RFP. Vendor must provide cloud hosting.")
        return {"status": "ok", "provider": provider.provider_name, "sample_output": result}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Provider test failed: {exc}")


async def _get_owned(provider_id: UUID, user: User, session: AsyncSession) -> AIProviderConfig:
    config = await session.get(AIProviderConfig, provider_id)
    if not config:
        raise HTTPException(status_code=404, detail="Provider not found")
    if config.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return config


async def _unset_defaults(org_id: UUID, session: AsyncSession) -> None:
    result = await session.execute(
        select(AIProviderConfig).where(
            AIProviderConfig.org_id == org_id,
            AIProviderConfig.is_default == True,
        )
    )
    for config in result.scalars().all():
        config.is_default = False
        session.add(config)
