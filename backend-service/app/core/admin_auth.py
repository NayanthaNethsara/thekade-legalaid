from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, Header, status

from app.core.config import get_settings

ALGORITHM = "HS256"
SESSION_DURATION_HOURS = 24


def create_admin_token(username: str) -> str:
    """Generate a signed JWT token for the authenticated admin user."""
    settings = get_settings()
    expiration = datetime.now(timezone.utc) + timedelta(hours=SESSION_DURATION_HOURS)
    payload = {
        "sub": username,
        "role": "admin",
        "exp": expiration,
    }
    return jwt.encode(payload, settings.admin_auth.secret_key, algorithm=ALGORITHM)


def verify_admin_token(token: str) -> str:
    """Verify and decode the admin JWT token, returning the admin username."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.admin_auth.secret_key, algorithms=[ALGORITHM])
        username: str = payload.get("sub", "")
        role: str = payload.get("role", "")
        if not username or role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin authorization claims.",
            )
        return username
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token.",
        )


async def require_admin_user(
    authorization: Annotated[str | None, Header()] = None,
    admin_token: Annotated[str | None, Cookie()] = None,
) -> str:
    """FastAPI dependency enforcing valid single-user admin authorization."""
    token = admin_token

    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required.",
        )

    return verify_admin_token(token)
