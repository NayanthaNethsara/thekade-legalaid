"""Redis-backed sliding-window rate limiting.

A single atomic Lua script enforces a rolling window per key, so concurrent
requests cannot race past the limit. Keys are namespaced by purpose (e.g.
``auth:login``) and identity (phone, principal id, or client IP) so one abuser
cannot exhaust another's quota.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from redis.asyncio import Redis

# Counts hits in a rolling window using a sorted set scored by timestamp.
# Returns {allowed (0/1), remaining, retry_after_ms}. Old entries are pruned and
# the key is given a TTL so idle identities clean themselves up.
_SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now_ms - window_ms)
local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry_after = window_ms - (now_ms - tonumber(oldest[2]))
  return {0, 0, retry_after}
end

redis.call('ZADD', key, now_ms, now_ms .. ':' .. math.random())
redis.call('PEXPIRE', key, window_ms)
return {1, limit - count - 1, 0}
"""


@dataclass(frozen=True)
class RateLimitPolicy:
    """How many requests are allowed within a rolling window of seconds."""

    limit: int
    window_seconds: int

    @property
    def window_ms(self) -> int:
        return self.window_seconds * 1000


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after_seconds: int


class RateLimiter:
    """Enforces sliding-window policies against a shared Redis instance."""

    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._script = redis.register_script(_SLIDING_WINDOW_SCRIPT)

    async def check(
        self, namespace: str, identity: str, policy: RateLimitPolicy
    ) -> RateLimitResult:
        """Record one hit for ``identity`` under ``namespace`` and report the verdict."""
        now_ms = int(time.time() * 1000)
        key = f"ratelimit:{namespace}:{identity}"
        allowed, remaining, retry_after_ms = await self._script(
            keys=[key],
            args=[now_ms, policy.window_ms, policy.limit],
        )
        return RateLimitResult(
            allowed=bool(allowed),
            remaining=int(remaining),
            retry_after_seconds=max(1, -(-int(retry_after_ms) // 1000)) if not allowed else 0,
        )
