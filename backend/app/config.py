from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "RFP Bid Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    SECRET_KEY: str = Field(..., description="JWT secret key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = Field(...)
    REDIS_URL: str = "redis://localhost:6379/0"

    CHROMADB_HOST: str = "localhost"
    CHROMADB_PORT: int = 8001

    ANTHROPIC_API_KEY: str = Field(...)
    OPENAI_API_KEY: str = Field(...)
    COHERE_API_KEY: str = Field(...)

    EXTRACTOR_PROVIDER: str = "claude"
    DRAFTER_PROVIDER: str = "claude"
    SCORER_PROVIDER: str = "claude"

    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    OPENAI_MODEL: str = "gpt-4o"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    COHERE_RERANK_MODEL: str = "rerank-english-v3.0"

    S3_BUCKET: str = "rfp-documents"
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    USE_LOCAL_STORAGE: bool = True
    LOCAL_STORAGE_PATH: str = "/tmp/rfp_uploads"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    RAG_TOP_K: int = 10
    RAG_RERANK_TOP_N: int = 3
    RAG_PASS_THRESHOLD: float = 0.75
    RAG_PARTIAL_THRESHOLD: float = 0.40

    PROPOSAL_TARGET_WORDS: int = 500
    WIN_SCORE_GO_THRESHOLD: int = 65
    COST_TRACKING_ENABLED: bool = True

    CLAUDE_INPUT_COST_PER_1K: float = 0.003
    CLAUDE_OUTPUT_COST_PER_1K: float = 0.015
    OPENAI_INPUT_COST_PER_1K: float = 0.005
    OPENAI_OUTPUT_COST_PER_1K: float = 0.015
    EMBEDDING_COST_PER_1K: float = 0.00002

    @field_validator("DATABASE_URL")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
