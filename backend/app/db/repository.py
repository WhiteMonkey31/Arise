from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, List, Optional, Tuple, Type, Union
from uuid import UUID

from firebase_admin.firestore import Client as FirestoreClient
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from app.config import settings
from app.db.firebase_client import (
    FirestoreSession,
    firestore_create_document,
    firestore_delete_document,
    firestore_get_by_id,
    firestore_query,
    firestore_update_document,
)

DbSession = Union[AsyncSession, FirestoreSession]


def _is_firestore() -> bool:
    return settings.FIREBASE_ENABLED


def _model_from_dict(model: Type[SQLModel], document: Optional[dict]) -> Optional[Any]:
    if document is None:
        return None
    return model(**document)


def _apply_filter(stmt, model: Type[SQLModel], field: str, op: str, value: Any):
    column = getattr(model, field)
    if op == "==":
        return stmt.where(column.is_(value) if value is None else column == value)
    if op == "!=":
        return stmt.where(column.is_not(value) if value is None else column != value)
    if op == ">":
        return stmt.where(column > value)
    if op == "<":
        return stmt.where(column < value)
    if op == ">=":
        return stmt.where(column >= value)
    if op == "<=":
        return stmt.where(column <= value)
    raise ValueError(f"Unsupported filter operator: {op}")


async def db_get_by_id(db: DbSession, model: Type[SQLModel], resource_id: UUID | str) -> Optional[Any]:
    if _is_firestore():
        document = firestore_get_by_id(model, str(resource_id))
        return _model_from_dict(model, document)

    return await db.get(model, resource_id)


async def db_query(
    db: DbSession,
    model: Type[SQLModel],
    filters: Optional[List[Tuple[str, str, Any]]] = None,
    order_by: Optional[Tuple[str, str]] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
) -> list[Any]:
    if _is_firestore():
        documents = firestore_query(model, filters=filters, order_by=order_by, limit=limit, offset=offset)
        return [_model_from_dict(model, doc) for doc in documents]

    stmt = select(model)
    if filters:
        for field, op, value in filters:
            stmt = _apply_filter(stmt, model, field, op, value)
    if order_by:
        field_name, direction = order_by
        column = getattr(model, field_name)
        stmt = stmt.order_by(desc(column) if direction.lower() == "desc" else column)
    if offset:
        stmt = stmt.offset(offset)
    if limit:
        stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def db_create(db: DbSession, instance: SQLModel) -> Any:
    if _is_firestore():
        document = firestore_create_document(type(instance), instance)
        return _model_from_dict(type(instance), document)

    db.add(instance)
    await db.flush()
    await db.refresh(instance)
    return instance


async def db_update(
    db: DbSession,
    model: Type[SQLModel],
    resource_id: UUID | str,
    values: dict,
) -> Any:
    if _is_firestore():
        document = firestore_update_document(model, str(resource_id), values)
        return _model_from_dict(model, document)

    entity = await db.get(model, resource_id)
    if entity is None:
        return None

    for key, value in values.items():
        setattr(entity, key, value)
    setattr(entity, "updated_at", datetime.now(timezone.utc))
    db.add(entity)
    await db.flush()
    await db.refresh(entity)
    return entity


async def db_delete(db: DbSession, model: Type[SQLModel], resource_id: UUID | str) -> None:
    if _is_firestore():
        firestore_delete_document(model, str(resource_id))
        return

    entity = await db.get(model, resource_id)
    if entity is not None:
        await db.delete(entity)
        await db.flush()
