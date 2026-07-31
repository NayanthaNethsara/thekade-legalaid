"""HTTP-facing rate limiting: dependencies, middleware, and 429 responses.

The sliding-window algorithm lives in `app.core.rate_limit`; this module adapts
it to FastAPI -- choosing the identity each endpoint keys on (principal or
client IP) and translating an exhausted window into a 429 with `Retry-After`.

Identity choice matters here: the frontend proxies calls server-side, so the
socket IP on most requests is the frontend's, not the caller's. Chat keys on
the authenticated principal; IP keying is used where no stronger identity
exists (sign-in, guest minting).
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, params, status
from starlette.responses import JSONResponse

from app.core.config import RateLimitSettings, Settings, get_settings
from app.core.rate_limit import RateLimiter, RateLimitPolicy
from app.db.redis import get_redis

PolicySelector = Callable[[RateLimitSettings], RateLimitPolicy]

_RETRY_MESSAGE = "Too many requests. Please slow down and try again later."

# Liveness/scrape endpoints must never be throttled (orchestration probes them).
_EXEMPT_PATHS = frozenset({"/health", "/metrics"})

_limiter: RateLimiter | None = None


def get_rate_limiter() -> RateLimiter:
    """Process-wide limiter on the shared Redis pool (mirrors `get_redis`)."""

    global _limiter
    if _limiter is None:
        _limiter = RateLimiter(get_redis())
    return _limiter


RateLimiterDep = Annotated[RateLimiter, Depends(get_rate_limiter)]


def client_ip(request: Request) -> str:
    """Best-effort client IP, honoring a single proxy hop.

    Behind our own frontend/load balancer the socket peer is the proxy, so the
    first `X-Forwarded-For` entry is the real client. Falls back to the peer
    address when the header is absent.
    """

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _too_many_requests(retry_after_seconds: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=_RETRY_MESSAGE,
        headers={"Retry-After": str(retry_after_seconds)},
    )


async def enforce_rate_limit(
    limiter: RateLimiter,
    settings: Settings,
    namespace: str,
    identity: str,
    policy: RateLimitPolicy,
) -> None:
    """Raise 429 if ``identity`` has exceeded ``policy`` under ``namespace``."""

    if not settings.rate_limit.enabled:
        return
    result = await limiter.check(namespace, identity, policy)
    if not result.allowed:
        raise _too_many_requests(result.retry_after_seconds)


def rate_limit_by_ip(namespace: str, select_policy: PolicySelector) -> params.Depends:
    """Limit an endpoint by client IP (used where no stronger identity exists)."""

    async def dependency(
        request: Request,
        limiter: RateLimiterDep,
        settings: Annotated[Settings, Depends(get_settings)],
    ) -> None:
        policy = select_policy(settings.rate_limit)
        await enforce_rate_limit(limiter, settings, namespace, client_ip(request), policy)

    return params.Depends(dependency)


def add_global_rate_limit(app: FastAPI, settings: Settings) -> None:
    """Per-IP safety net across the whole API.

    A coarse backstop in front of the per-endpoint limits; the tighter auth and
    chat limits do the real work. Disabled via ``RATE_LIMIT_ENABLED=false``.
    """

    if not settings.rate_limit.enabled:
        return

    policy = settings.rate_limit.global_policy

    @app.middleware("http")
    async def global_rate_limit(request: Request, call_next):  # type: ignore[no-untyped-def]
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        result = await get_rate_limiter().check("global", client_ip(request), policy)
        if not result.allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": _RETRY_MESSAGE},
                headers={"Retry-After": str(result.retry_after_seconds)},
            )
        return await call_next(request)
