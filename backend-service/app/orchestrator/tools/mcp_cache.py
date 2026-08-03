"""Redis-backed cache for read-only Kakille MCP tool results.

Legal knowledge search embeds the query and runs a vector lookup on every
call, so caching repeat queries saves both latency and embedding cost.

Only side-effect-free read tools are cached. Cache access fails open: a Redis
outage degrades to direct MCP calls rather than breaking the turn.
"""

import hashlib
import json
from typing import Any

from app.core.logging import get_logger
from app.db.redis import get_redis

logger = get_logger(__name__)

_KEY_PREFIX = "mcp:read:"

# Side-effect-free Kakille tools whose results are safe to reuse within the TTL.
# Everything else bypasses the cache.
_CACHEABLE_TOOLS = frozenset({"kakille_search_legal_knowledge"})


def is_cacheable_tool(tool_name: str) -> bool:
    return tool_name in _CACHEABLE_TOOLS


def _cache_key(tool_name: str, tool_args: dict[str, Any]) -> str:
    """Build a stable key from the tool name and normalized arguments.

    Args are JSON-serialized with sorted keys so semantically identical calls
    collide on the same key regardless of dict ordering.
    """
    serialized = json.dumps(tool_args, sort_keys=True, default=str)
    digest = hashlib.sha256(serialized.encode()).hexdigest()[:32]
    return f"{_KEY_PREFIX}{tool_name}:{digest}"


# Sentinel distinguishing a cache miss from a cached null tool output.
_MISS = object()


async def get_cached_result(tool_name: str, tool_args: dict[str, Any]) -> Any:
    """Return the cached raw tool output, or ``_MISS`` on miss or cache error.

    Callers must compare against ``_MISS`` (use :func:`is_miss`) rather than
    truthiness, since a cached output may legitimately be empty.
    """
    try:
        cached = await get_redis().get(_cache_key(tool_name, tool_args))
    except Exception as error:
        logger.warning("orchestrator.mcp_cache.get_failed", tool=tool_name, error=str(error))
        return _MISS

    if cached is None:
        return _MISS

    logger.info("orchestrator.mcp_cache.hit", tool=tool_name)
    try:
        return json.loads(cached)
    except (ValueError, TypeError):
        return _MISS


def is_miss(value: Any) -> bool:
    return value is _MISS


async def set_cached_result(
    tool_name: str, tool_args: dict[str, Any], tool_output: Any, ttl_seconds: int
) -> None:
    """Store a successful raw tool output. No-op on error or non-positive TTL."""
    if ttl_seconds <= 0:
        return
    try:
        serialized = json.dumps(tool_output, default=str)
    except (TypeError, ValueError) as error:
        logger.warning("orchestrator.mcp_cache.encode_failed", tool=tool_name, error=str(error))
        return
    try:
        await get_redis().set(_cache_key(tool_name, tool_args), serialized, ex=ttl_seconds)
    except Exception as error:
        logger.warning("orchestrator.mcp_cache.set_failed", tool=tool_name, error=str(error))
