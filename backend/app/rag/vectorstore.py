from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.logger import get_logger

logger = get_logger("vectorstore")

COLLECTION_NAME = "capabilities"


class VectorStore:
    def __init__(self) -> None:
        self._client = None
        self._collection = None

    def _get_client(self):
        if self._client is None:
            self._client = chromadb.HttpClient(
                host=settings.CHROMADB_HOST,
                port=settings.CHROMADB_PORT,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    def _get_collection(self):
        if self._collection is None:
            self._collection = self._get_client().get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def add_capability(self, capability_id: str, text: str, embedding: List[float], metadata: Dict[str, Any]) -> None:
        self._get_collection().upsert(
            ids=[capability_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[metadata],
        )

    def search_similar(self, query_embedding: List[float], n_results: int = 10, where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        result = self._get_collection().query(**kwargs)

        hits = []
        ids = result["ids"][0] if result["ids"] else []
        documents = result["documents"][0] if result["documents"] else []
        metadatas = result["metadatas"][0] if result["metadatas"] else []
        distances = result["distances"][0] if result["distances"] else []

        for cap_id, doc, meta, dist in zip(ids, documents, metadatas, distances):
            hits.append({"id": cap_id, "document": doc, "metadata": meta, "distance": dist, "score": 1.0 - dist})

        return hits

    def delete_capability(self, capability_id: str) -> None:
        self._get_collection().delete(ids=[capability_id])

    def update_capability(self, capability_id: str, text: str, embedding: List[float], metadata: Dict[str, Any]) -> None:
        self.add_capability(capability_id, text, embedding, metadata)

    def count(self) -> int:
        return self._get_collection().count()


vector_store = VectorStore()
