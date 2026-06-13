from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from firebase_admin.firestore import Client as FirestoreClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings
from app.db.firebase_client import FirestoreSession, init_firestore_client
from app.logger import get_logger

logger = get_logger("database")

# Lazily initialized — only created when Firebase is NOT enabled
_engine = None
_async_session_factory = None


def _get_engine():
    global _engine, _async_session_factory
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
        )
        _async_session_factory = sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _engine, _async_session_factory


# Keep `engine` as a property-like accessor for the /ready health check
class _EngineProxy:
    def __getattr__(self, name):
        return getattr(_get_engine()[0], name)

    def connect(self):
        return _get_engine()[0].connect()


engine = _EngineProxy()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    if settings.FIREBASE_ENABLED:
        raise RuntimeError("get_session() should not be used when FIREBASE_ENABLED=true")

    _, session_factory = _get_engine()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession | FirestoreSession, None]:
    if settings.FIREBASE_ENABLED:
        firestore_session = FirestoreSession(init_firestore_client())
        try:
            yield firestore_session
            await firestore_session.commit()
        except Exception:
            await firestore_session.rollback()
            raise
        finally:
            await firestore_session.close()
        return

    _, session_factory = _get_engine()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db() -> AsyncGenerator[AsyncSession | FirestoreSession, None]:
    async with get_db_session() as session:
        yield session


async def create_tables() -> None:
    if settings.FIREBASE_ENABLED:
        logger.info("Firebase enabled; skipping SQL table creation")
        init_firestore_client()
        return

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    logger.info("Tables ready")
