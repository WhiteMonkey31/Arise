from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Optional, Type
from uuid import UUID

from firebase_admin import App, credentials, firestore, initialize_app
from firebase_admin.firestore import Client as FirestoreClient, CollectionReference, DocumentSnapshot
from sqlalchemy.sql import Select
from sqlalchemy.sql.elements import BinaryExpression, UnaryExpression, BindParameter

from app.config import settings
from app.logger import get_logger

logger = get_logger("firebase_client")

_firebase_app: Optional[App] = None
_firestore_client: Optional[FirestoreClient] = None



class FirestoreSession:
    """SQLModel-compatible session wrapper for Firestore.
    
    Provides execute(), get(), add(), flush(), delete(), refresh() and other
    async session-like methods to allow code written for AsyncSession to work with Firestore.
    """
    
    def __init__(self, client: FirestoreClient) -> None:
        self.client = client
        self._pending: list[Any] = []  # Track instances to persist on flush

    async def commit(self) -> None:
        """Flush and commit pending changes."""
        await self.flush()

    async def rollback(self) -> None:
        """Discard pending changes without persisting."""
        self._pending.clear()

    async def close(self) -> None:
        """Clean up session resources."""
        self._pending.clear()

    async def get(self, model: Type[Any], resource_id) -> Optional[Any]:
        """Get a single document by model and ID.
        
        Args:
            model: SQLModel class.
            resource_id: UUID or string ID.
        
        Returns:
            Instance of model or None if not found.
        """
        document = firestore_get_by_id(model, str(resource_id))
        return _model_from_dict(model, document)

    def add(self, instance: Any) -> None:
        """Stage an instance for creation/update on flush."""
        self._pending.append(instance)

    async def flush(self) -> None:
        """Persist all staged instances to Firestore."""
        for instance in self._pending:
            # Check if it already exists; if so, update it, otherwise create
            existing_doc = firestore_get_by_id(type(instance), str(instance.id))
            if existing_doc:
                firestore_update_document(type(instance), str(instance.id), model_to_firestore_dict(instance))
            else:
                firestore_create_document(type(instance), instance)
        self._pending.clear()

    async def refresh(self, instance: Any) -> None:
        """Reload instance data from Firestore (no-op for Firestore, data already fresh)."""
        pass

    async def delete(self, instance: Any) -> None:
        """Delete an instance from Firestore."""
        firestore_delete_document(type(instance), str(instance.id))

    async def execute(self, stmt: Any) -> "FirestoreResult":
        """Execute a SQLModel select statement against Firestore.
        
        Parses SQLModel select(...) statements and translates them to Firestore queries.
        
        Args:
            stmt: A sqlmodel.select(...) statement.
        
        Returns:
            A FirestoreResult that mimics ScalarResult behavior.
        """
        model, filters, order_by, limit, offset = _parse_select_stmt(stmt)
        documents = firestore_query(model, filters=filters, order_by=order_by, limit=limit, offset=offset)
        instances = [_model_from_dict(model, doc) for doc in documents if doc]
        return FirestoreResult(instances, model)


def init_firestore_client() -> FirestoreClient:
    global _firebase_app, _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    if not settings.FIREBASE_ENABLED:
        raise RuntimeError("Firebase is not enabled")

    cred = None
    if settings.FIREBASE_CREDENTIALS_PATH:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    elif settings.FIREBASE_CREDENTIALS_JSON:
        cred = credentials.Certificate(json.loads(settings.FIREBASE_CREDENTIALS_JSON))
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

    if cred is None:
        raise RuntimeError(
            "Firebase credentials are required. Set FIREBASE_CREDENTIALS_PATH, FIREBASE_CREDENTIALS_JSON, or GOOGLE_APPLICATION_CREDENTIALS."
        )

    if settings.FIREBASE_PROJECT_ID:
        _firebase_app = initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
    else:
        _firebase_app = initialize_app(cred)

    _firestore_client = firestore.client(_firebase_app)
    logger.info("Initialized Firebase Firestore client", project_id=settings.FIREBASE_PROJECT_ID)
    return _firestore_client


def get_firestore_client() -> FirestoreClient:
    return init_firestore_client()


def get_collection_name(model: Type[Any]) -> str:
    return getattr(model, "__tablename__", model.__name__.lower() + "s")


def get_collection(model: Type[Any]) -> CollectionReference:
    return get_firestore_client().collection(get_collection_name(model))


def normalize_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def model_to_firestore_dict(instance: Any, exclude: Optional[set[str]] = None) -> dict:
    exclude = exclude or set()
    data = instance.model_dump(exclude_none=False)
    document = {}
    for key, value in data.items():
        if key in exclude or key == "id":
            continue
        document[key] = normalize_value(value)
    return document


def _parse_select_stmt(stmt: Select) -> tuple[Type[Any], Optional[list], Optional[tuple], Optional[int], Optional[int]]:
    """Parse a SQLModel select(...) statement into Firestore query components.
    
    Extracts:
    - The model being queried
    - WHERE conditions (filters)
    - ORDER BY clause
    - LIMIT
    - OFFSET
    
    Returns:
        (model, filters_list, order_by_tuple, limit, offset)
        where filters_list is [(field_name, operator, value), ...]
    """
    from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList
    from sqlalchemy.sql import operators as sql_operators
    
    # Extract model from statement
    if not stmt.froms:
        raise ValueError("Cannot extract model from select statement")
    model = stmt.froms[0].entity.class_
    
    # Extract limit and offset
    limit = stmt._limit
    offset = stmt._offset
    
    # Extract where filters
    filters = []
    if stmt.whereclause is not None:
        filters = _extract_filters(stmt.whereclause)
    
    # Extract order_by
    order_by = None
    if stmt._order_by:
        order_clause = stmt._order_by[0]  # First order clause
        column_name = order_clause.key if hasattr(order_clause, 'key') else str(order_clause).split('.')[-1]
        is_desc = order_clause.modifier == "desc" if hasattr(order_clause, 'modifier') else False
        order_by = (column_name, "desc" if is_desc else "asc")
    
    return (model, filters, order_by, limit, offset)


def _extract_filters(whereclause: Any) -> list[tuple[str, str, Any]]:
    """Recursively extract filter conditions from a WHERE clause.
    
    Returns:
        List of (field_name, operator, value) tuples.
    """
    from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList, UnaryExpression
    from sqlalchemy.sql import operators as sql_operators
    
    filters = []
    
    if isinstance(whereclause, BinaryExpression):
        # Single condition like Column == value
        left = whereclause.left
        right = whereclause.right
        op = whereclause.operator
        
        # Get column name
        column_name = None
        if hasattr(left, 'key'):
            column_name = left.key
        elif hasattr(left, 'name'):
            column_name = left.name
        else:
            column_name = str(left).split('.')[-1]
        
        # Get filter value
        value = None
        if hasattr(right, 'value'):
            value = right.value
        elif isinstance(right, (int, str, float, bool, type(None))):
            value = right
        else:
            value = right
        
        # Map operator
        op_str = _map_operator(op)
        if column_name and op_str:
            filters.append((column_name, op_str, value))
    
    elif isinstance(whereclause, BooleanClauseList):
        # Compound condition like WHERE a == 1 AND b == 2
        for clause in whereclause.clauses:
            filters.extend(_extract_filters(clause))
    
    elif isinstance(whereclause, UnaryExpression):
        # Handle unary like IS NULL
        operand = whereclause.element
        op = whereclause.operator
        
        column_name = None
        if hasattr(operand, 'key'):
            column_name = operand.key
        elif hasattr(operand, 'name'):
            column_name = operand.name
        else:
            column_name = str(operand).split('.')[-1]
        
        op_str = _map_operator(op)
        if column_name and op_str:
            filters.append((column_name, op_str, None))
    
    return filters


def _map_operator(op) -> Optional[str]:
    """Map SQLAlchemy operator to Firestore operator string."""
    op_name = getattr(op, '__name__', str(op)).lower()
    
    mapping = {
        'eq': '==',
        'ne': '!=',
        'gt': '>',
        'lt': '<',
        'ge': '>=',
        'le': '<=',
        'isnot': '!=',
        'is_': '==',
    }
    
    return mapping.get(op_name, op_name if op_name in ('==', '!=', '>', '<', '>=', '<=') else None)


class FirestoreResult:
    """Result object mimicking sqlalchemy.engine.result.ScalarResult.
    
    Used by FirestoreSession.execute() to return query results in a format
    compatible with SQLAlchemy async session patterns.
    """
    
    def __init__(self, instances: list[Any], model: Type[Any]) -> None:
        self._instances = instances
        self._model = model
    
    def scalars(self) -> "ScalarsProxy":
        """Return a proxy that behaves like result.scalars()."""
        return ScalarsProxy(self._instances)
    
    async def __aiter__(self):
        """Support async iteration."""
        for instance in self._instances:
            yield instance


class ScalarsProxy:
    """Proxy for result.scalars() that matches SQLAlchemy's interface."""
    
    def __init__(self, instances: list[Any]) -> None:
        self._instances = instances
    
    def all(self) -> list[Any]:
        """Return all results."""
        return self._instances
    
    def first(self) -> Optional[Any]:
        """Return the first result."""
        return self._instances[0] if self._instances else None
    
    async def __aiter__(self):
        """Support async iteration."""
        for instance in self._instances:
            yield instance



def doc_snapshot_to_dict(snapshot: DocumentSnapshot) -> dict:
    if not snapshot.exists:
        return {}
    data = snapshot.to_dict() or {}
    data["id"] = snapshot.id
    return data


def firestore_get_by_id(model: Type[Any], document_id: str) -> Optional[dict]:
    snapshot = get_collection(model).document(document_id).get()
    if not snapshot.exists:
        return None
    return doc_snapshot_to_dict(snapshot)


def firestore_query(
    model: Type[Any],
    filters: Optional[list[tuple[str, str, Any]]] = None,
    order_by: Optional[tuple[str, str]] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
) -> list[dict]:
    query = get_collection(model)
    if filters:
        for field, op, value in filters:
            query = query.where(field, op, normalize_value(value))
    if order_by:
        field, direction = order_by
        direction = direction.upper()
        if direction == "DESC":
            query = query.order_by(field, direction=firestore.Query.DESCENDING)
        else:
            query = query.order_by(field, direction=firestore.Query.ASCENDING)
    if offset is not None:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return [doc_snapshot_to_dict(doc) for doc in query.stream()]


def firestore_create_document(model: Type[Any], instance: Any) -> dict:
    document_id = str(instance.id)
    data = model_to_firestore_dict(instance)
    get_collection(model).document(document_id).set(data)
    return {"id": document_id, **data}


def firestore_update_document(model: Type[Any], document_id: str, values: dict) -> dict:
    cleaned = {key: normalize_value(value) for key, value in values.items() if key != "id"}
    get_collection(model).document(document_id).update(cleaned)
    snapshot = get_collection(model).document(document_id).get()
    return doc_snapshot_to_dict(snapshot)


def firestore_delete_document(model: Type[Any], document_id: str) -> None:
    get_collection(model).document(document_id).delete()
