from redis.asyncio import Redis, from_url

from app.core.config import get_settings

_redis: Redis | None = None


def get_redis() -> Redis:
    """Lazily build the process-wide async Redis client from settings.

    `decode_responses=True` so values come back as `str`, matching the JSON we
    store for guest sessions.
    """

    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = from_url(settings.redis.url, decode_responses=True)
    return _redis


async def dispose_redis() -> None:
    """Release the connection pool on shutdown."""

    global _redis
    if _redis is not None:
        await _redis.aclose()
    _redis = None
