"""
Redis client for session state caching and pub/sub.
"""

import json
from typing import Any

import redis.asyncio as redis

from app.config import get_settings

settings = get_settings()

# Redis connection pool
redis_pool = redis.ConnectionPool.from_url(
    settings.redis_url,
    decode_responses=True,
    max_connections=20,
)


def get_redis() -> redis.Redis:
    """Get a Redis client from the connection pool."""
    return redis.Redis(connection_pool=redis_pool)


class SessionStateManager:
    """Manages session state in Redis for fast access during active interviews."""

    SESSION_PREFIX = "session:"
    SESSION_TTL = 3600  # 1 hour

    ASR_CACHE_PREFIX = "asr:"
    ASR_CACHE_TTL = 300  # 5 minutes

    QUEUE_PREFIX = "queue:"
    RATE_LIMIT_PREFIX = "rate_limit:"
    DASHBOARD_PREFIX = "dashboard:"
    DASHBOARD_TTL = 30  # 30 seconds

    def __init__(self) -> None:
        self.redis = get_redis()

    async def set_session_state(self, session_id: int, state: dict[str, Any]) -> None:
        """Store active session state in Redis."""
        key = f"{self.SESSION_PREFIX}{session_id}"
        await self.redis.hset(
            key,
            mapping={k: json.dumps(v) if isinstance(v, (dict, list)) else str(v) for k, v in state.items()},
        )
        await self.redis.expire(key, self.SESSION_TTL)

    async def get_session_state(self, session_id: int) -> dict[str, Any] | None:
        """Retrieve active session state from Redis."""
        key = f"{self.SESSION_PREFIX}{session_id}"
        data = await self.redis.hgetall(key)
        if not data:
            return None
        # Parse JSON fields
        parsed = {}
        for k, v in data.items():
            try:
                parsed[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                parsed[k] = v
        return parsed

    async def update_session_field(self, session_id: int, field: str, value: Any) -> None:
        """Update a single field in session state."""
        key = f"{self.SESSION_PREFIX}{session_id}"
        serialized = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        await self.redis.hset(key, field, serialized)
        await self.redis.expire(key, self.SESSION_TTL)

    async def delete_session_state(self, session_id: int) -> None:
        """Remove session state from Redis."""
        key = f"{self.SESSION_PREFIX}{session_id}"
        await self.redis.delete(key)

    async def cache_asr_result(self, audio_hash: str, transcript: str) -> None:
        """Cache ASR transcription result by audio hash."""
        key = f"{self.ASR_CACHE_PREFIX}{audio_hash}"
        await self.redis.set(key, transcript, ex=self.ASR_CACHE_TTL)

    async def get_cached_asr(self, audio_hash: str) -> str | None:
        """Get cached ASR result if available."""
        key = f"{self.ASR_CACHE_PREFIX}{audio_hash}"
        return await self.redis.get(key)

    async def check_rate_limit(self, identifier: str, max_requests: int = 100, window: int = 60) -> bool:
        """Check if request is within rate limit. Returns True if allowed."""
        key = f"{self.RATE_LIMIT_PREFIX}{identifier}"
        current = await self.redis.get(key)
        if current is None:
            await self.redis.set(key, 1, ex=window)
            return True
        if int(current) >= max_requests:
            return False
        await self.redis.incr(key)
        return True

    async def add_to_queue(self, department: str, date: str, session_id: int, priority: float) -> None:
        """Add session to department queue (sorted set)."""
        key = f"{self.QUEUE_PREFIX}{department}:{date}"
        await self.redis.zadd(key, {str(session_id): priority})

    async def get_queue(self, department: str, date: str, limit: int = 50) -> list[str]:
        """Get ordered queue for a department."""
        key = f"{self.QUEUE_PREFIX}{department}:{date}"
        return await self.redis.zrange(key, 0, limit - 1)

    async def close(self) -> None:
        """Close the Redis connection pool."""
        await self.redis.aclose()


async def get_session_state_manager() -> SessionStateManager:
    """FastAPI dependency: get session state manager."""
    return SessionStateManager()
