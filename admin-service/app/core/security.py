"""Edge-request authentication and RBAC for the RAG routers.

The Next.js edge signs each forwarded request with the shared secret and relays
the verified role. `verify_internal_signature` rejects anything not signed by
the edge (and replays); `require_admin` additionally gates mutations on role.
"""

import hashlib
import hmac
import time

import redis
from fastapi import Header, HTTPException, Request, status

from app.core.config import settings

ADMIN_ROLE = "ADMIN"
AUTH_TIMESTAMP_SKEW_SECONDS = 30
AUTH_NONCE_TTL_SECONDS = 2 * AUTH_TIMESTAMP_SKEW_SECONDS

_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)


def verify_internal_signature(
    request: Request,
    x_auth_timestamp: str | None = Header(default=None),
    x_auth_signature: str | None = Header(default=None),
    x_auth_nonce: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    x_user_role: str | None = Header(default=None),
) -> None:
    secret = settings.INTERNAL_AUTH_SECRET
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth not configured",
        )
    if not x_auth_timestamp or not x_auth_signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth headers")

    try:
        sent_at = int(x_auth_timestamp)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed timestamp")
    if abs(time.time() - sent_at) > AUTH_TIMESTAMP_SKEW_SECONDS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Stale timestamp")

    canonical = "\n".join(
        [
            request.method,
            request.url.path,
            x_user_id or "",
            x_user_role or "",
            x_auth_timestamp,
            x_auth_nonce or "",
        ]
    )
    expected = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_auth_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal signature")

    if x_auth_nonce:
        try:
            fresh = _redis.set(f"internalauth:nonce:{x_auth_nonce}", "1", nx=True, ex=AUTH_NONCE_TTL_SECONDS)
        except redis.RedisError:
            fresh = True  # fail open: signature + timestamp still hold
        if not fresh:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Replayed request")


def require_admin(x_user_role: str | None = Header(default=None)) -> str:
    """Allow the request only when the forwarded role is ADMIN."""
    if x_user_role != ADMIN_ROLE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return x_user_role
