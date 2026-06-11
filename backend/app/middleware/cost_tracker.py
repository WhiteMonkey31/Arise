import time
from typing import Any, Dict, Optional

import redis.asyncio as aioredis
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings
from app.logger import get_logger

logger = get_logger("cost_tracker")

_USAGE_PREFIX = "usage"
_RETENTION = 86400 * 90  # 90 days

COST_TABLE = {
    "claude_input": settings.CLAUDE_INPUT_COST_PER_1K,
    "claude_output": settings.CLAUDE_OUTPUT_COST_PER_1K,
    "openai_input": settings.OPENAI_INPUT_COST_PER_1K,
    "openai_output": settings.OPENAI_OUTPUT_COST_PER_1K,
    "embedding": settings.EMBEDDING_COST_PER_1K,
}


class CostTrackerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.start_time = time.time()
        request.state.org_id = None
        response = await call_next(request)
        duration_ms = (time.time() - request.state.start_time) * 1000
        response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
        return response


class UsageTracker:
    def __init__(self) -> None:
        self._redis: Optional[aioredis.Redis] = None

    def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        return self._redis

    async def track_usage(self, org_id: str, provider: str, input_tokens: int = 0, output_tokens: int = 0) -> float:
        if not settings.COST_TRACKING_ENABLED:
            return 0.0

        input_cost = (input_tokens / 1000) * COST_TABLE.get(f"{provider}_input", 0)
        output_cost = (output_tokens / 1000) * COST_TABLE.get(f"{provider}_output", 0)
        total = input_cost + output_cost

        redis = self._get_redis()
        key = f"{_USAGE_PREFIX}:{org_id}"
        pipe = redis.pipeline()
        pipe.hincrbyfloat(key, "total_input_tokens", input_tokens)
        pipe.hincrbyfloat(key, "total_output_tokens", output_tokens)
        pipe.hincrbyfloat(key, "total_cost_usd", total)
        pipe.hincrbyfloat(key, f"{provider}_input_tokens", input_tokens)
        pipe.hincrbyfloat(key, f"{provider}_output_tokens", output_tokens)
        pipe.hincrbyfloat(key, f"{provider}_cost_usd", total)
        pipe.expire(key, _RETENTION)
        await pipe.execute()
        return total

    async def get_usage(self, org_id: str) -> Dict[str, Any]:
        redis = self._get_redis()
        data = await redis.hgetall(f"{_USAGE_PREFIX}:{org_id}")

        if not data:
            return {"org_id": org_id, "total_input_tokens": 0, "total_output_tokens": 0, "total_cost_usd": 0.0, "providers": {}}

        providers: Dict[str, Any] = {}
        for name in ("claude", "openai", "embedding"):
            in_t = float(data.get(f"{name}_input_tokens", 0))
            out_t = float(data.get(f"{name}_output_tokens", 0))
            cost = float(data.get(f"{name}_cost_usd", 0))
            if in_t > 0 or out_t > 0:
                providers[name] = {"input_tokens": int(in_t), "output_tokens": int(out_t), "cost_usd": round(cost, 4)}

        return {
            "org_id": org_id,
            "total_input_tokens": int(float(data.get("total_input_tokens", 0))),
            "total_output_tokens": int(float(data.get("total_output_tokens", 0))),
            "total_cost_usd": round(float(data.get("total_cost_usd", 0)), 4),
            "providers": providers,
        }

    async def estimate_cost(self, provider: str, input_tokens: int, output_tokens: int = 0) -> float:
        return round(
            (input_tokens / 1000) * COST_TABLE.get(f"{provider}_input", 0) +
            (output_tokens / 1000) * COST_TABLE.get(f"{provider}_output", 0),
            6,
        )

    async def reset_usage(self, org_id: str) -> None:
        await self._get_redis().delete(f"{_USAGE_PREFIX}:{org_id}")


usage_tracker = UsageTracker()
