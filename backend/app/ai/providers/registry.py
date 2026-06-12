"""
Provider registry — resolves the correct AIProvider at runtime.

Priority order for provider selection:
  1. If org has an active AIProviderConfig with matching task type → use it
  2. Fall back to env-var defaults (EXTRACTOR_PROVIDER, DRAFTER_PROVIDER, etc.)
  3. Use built-in system keys from settings
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.ai.providers.base import AIProvider
from app.config import settings
from app.logger import get_logger

logger = get_logger("provider_registry")

# Encryption helper (simple Fernet wrapping)
def _decrypt_key(encrypted: str) -> str:
    from cryptography.fernet import Fernet
    import base64
    # Derive a valid Fernet key from our 32-char config key
    raw = settings.ENCRYPTION_KEY.encode()[:32].ljust(32, b"0")
    fernet_key = base64.urlsafe_b64encode(raw)
    return Fernet(fernet_key).decrypt(encrypted.encode()).decode()


def encrypt_key(plain: str) -> str:
    from cryptography.fernet import Fernet
    import base64
    raw = settings.ENCRYPTION_KEY.encode()[:32].ljust(32, b"0")
    fernet_key = base64.urlsafe_b64encode(raw)
    return Fernet(fernet_key).encrypt(plain.encode()).decode()


def _build_provider(provider_type: str, api_key: str, model_name: str, base_url: Optional[str] = None) -> AIProvider:
    """Instantiate a provider from its type string."""
    if provider_type == "claude":
        from app.ai.providers.claude import ClaudeProvider
        return ClaudeProvider(api_key=api_key, model_name=model_name)
    elif provider_type == "openai":
        from app.ai.providers.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=api_key, model_name=model_name)
    elif provider_type == "gemini":
        from app.ai.providers.gemini import GeminiProvider
        return GeminiProvider(api_key=api_key, model_name=model_name)
    elif provider_type == "grok":
        from app.ai.providers.grok import GrokProvider
        return GrokProvider(api_key=api_key, model_name=model_name)
    elif provider_type == "custom":
        # Custom providers use an OpenAI-compatible endpoint
        from app.ai.providers.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=api_key, model_name=model_name, base_url=base_url)
    else:
        raise ValueError(f"Unknown provider type: {provider_type}")


def _get_system_provider(provider_name: str) -> AIProvider:
    """Build a provider using system-level API keys from settings."""
    if provider_name == "claude":
        from app.ai.providers.claude import ClaudeProvider
        return ClaudeProvider(api_key=settings.ANTHROPIC_API_KEY or "", model_name=settings.CLAUDE_MODEL)
    elif provider_name == "openai":
        from app.ai.providers.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY or "", model_name=settings.OPENAI_MODEL)
    elif provider_name == "gemini":
        from app.ai.providers.gemini import GeminiProvider
        return GeminiProvider(api_key=settings.GEMINI_API_KEY or "", model_name=settings.GEMINI_MODEL)
    elif provider_name == "grok":
        from app.ai.providers.grok import GrokProvider
        return GrokProvider(api_key=settings.GROK_API_KEY or "", model_name=settings.GROK_MODEL)
    else:
        # Default fallback
        from app.ai.providers.claude import ClaudeProvider
        return ClaudeProvider(api_key=settings.ANTHROPIC_API_KEY or "", model_name=settings.CLAUDE_MODEL)


async def get_provider_for_org(
    org_id: UUID,
    task: str,  # "extractor" | "drafter" | "scorer"
    session: AsyncSession,
    override_provider_id: Optional[UUID] = None,
) -> AIProvider:
    """
    Resolve the best AIProvider for an org and task.

    If override_provider_id is passed, use that specific config.
    Otherwise use the org's default, then fall back to system defaults.
    """
    from app.db.models import AIProviderConfig

    # Specific override requested (user picked a provider in the UI)
    if override_provider_id:
        config = await session.get(AIProviderConfig, override_provider_id)
        if config and config.org_id == org_id and config.is_active:
            try:
                api_key = _decrypt_key(config.api_key_encrypted)
                return _build_provider(config.provider_type, api_key, config.model_name, config.base_url)
            except Exception as exc:
                logger.error("Failed to build provider from config", error=str(exc), config_id=str(override_provider_id))

    # Try org's default active provider
    result = await session.execute(
        select(AIProviderConfig).where(
            AIProviderConfig.org_id == org_id,
            AIProviderConfig.is_active == True,
            AIProviderConfig.is_default == True,
        )
    )
    default_config = result.scalars().first()

    if default_config:
        try:
            api_key = _decrypt_key(default_config.api_key_encrypted)
            return _build_provider(default_config.provider_type, api_key, default_config.model_name, default_config.base_url)
        except Exception as exc:
            logger.warning("Failed to build org default provider, falling back to system", error=str(exc))

    # System-level fallback
    task_provider_map = {
        "extractor": settings.EXTRACTOR_PROVIDER,
        "drafter": settings.DRAFTER_PROVIDER,
        "scorer": settings.SCORER_PROVIDER,
    }
    provider_name = task_provider_map.get(task, settings.EXTRACTOR_PROVIDER)
    return _get_system_provider(provider_name)


def get_system_provider(task: str) -> AIProvider:
    """Synchronous system provider lookup — for use in Celery tasks."""
    task_map = {
        "extractor": settings.EXTRACTOR_PROVIDER,
        "drafter": settings.DRAFTER_PROVIDER,
        "scorer": settings.SCORER_PROVIDER,
    }
    return _get_system_provider(task_map.get(task, "claude"))
