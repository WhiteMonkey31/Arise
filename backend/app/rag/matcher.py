from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import cohere

from app.config import settings
from app.db.models import ComplianceStatus
from app.logger import get_logger
from app.rag.embedder import embedder
from app.rag.vectorstore import vector_store

logger = get_logger("matcher")


@dataclass
class MatchResult:
    capability_id: str
    score: float
    status: ComplianceStatus
    document: str
    metadata: Dict[str, Any]


class RAGMatcher:
    def __init__(self) -> None:
        self._cohere = cohere.Client(api_key=settings.COHERE_API_KEY)

    async def match(self, requirement_text: str, org_id: Optional[str] = None) -> List[MatchResult]:
        query_embedding = await embedder.embed_text(requirement_text)
        where_filter = {"org_id": org_id} if org_id else None
        candidates = vector_store.search_similar(
            query_embedding=query_embedding,
            n_results=settings.RAG_TOP_K,
            where=where_filter,
        )

        if not candidates:
            return []

        docs = [c["document"] for c in candidates]
        try:
            reranked = self._cohere.rerank(
                model=settings.COHERE_RERANK_MODEL,
                query=requirement_text,
                documents=docs,
                top_n=settings.RAG_RERANK_TOP_N,
                return_documents=True,
            ).results
        except cohere.CohereAPIError as exc:
            logger.error("Cohere rerank failed, using raw scores", error=str(exc))
            return [
                self._build_result(c["id"], c["score"], c["document"], c["metadata"])
                for c in candidates[:settings.RAG_RERANK_TOP_N]
            ]

        results = [
            self._build_result(
                capability_id=candidates[r.index]["id"],
                score=r.relevance_score,
                document=candidates[r.index]["document"],
                metadata=candidates[r.index]["metadata"],
            )
            for r in reranked
        ]
        return sorted(results, key=lambda x: x.score, reverse=True)

    def _build_result(self, capability_id: str, score: float, document: str, metadata: Dict[str, Any]) -> MatchResult:
        if score >= settings.RAG_PASS_THRESHOLD:
            status = ComplianceStatus.PASS
        elif score >= settings.RAG_PARTIAL_THRESHOLD:
            status = ComplianceStatus.PARTIAL
        else:
            status = ComplianceStatus.GAP

        return MatchResult(capability_id=capability_id, score=score, status=status, document=document, metadata=metadata)


rag_matcher = RAGMatcher()
