from typing import List

import openai
from openai import AsyncOpenAI

from app.config import settings
from app.logger import get_logger

logger = get_logger("embedder")

_BATCH_SIZE = 100


class Embedder:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.EMBEDDING_MODEL

    async def embed_text(self, text: str) -> List[float]:
        text = text[:30000]
        response = await self._client.embeddings.create(
            model=self.model,
            input=text,
            encoding_format="float",
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        truncated = [t[:30000] for t in texts]
        results = []

        for i in range(0, len(truncated), _BATCH_SIZE):
            batch = truncated[i: i + _BATCH_SIZE]
            try:
                response = await self._client.embeddings.create(
                    model=self.model,
                    input=batch,
                    encoding_format="float",
                )
                vectors = [d.embedding for d in sorted(response.data, key=lambda x: x.index)]
                results.extend(vectors)
            except openai.OpenAIError as exc:
                logger.error("Batch embedding failed", error=str(exc), batch_start=i)
                raise

        return results


embedder = Embedder()
