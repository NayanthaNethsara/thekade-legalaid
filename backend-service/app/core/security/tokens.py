from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt

from app.core.config import AuthSettings

TokenType = Literal["access", "refresh", "guest"]


class InvalidTokenError(Exception):
    """Raised when a JWT is malformed, expired, or of the wrong type."""


def _create_token(
    subject: str, token_type: TokenType, expires_delta: timedelta, settings: AuthSettings
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, settings: AuthSettings) -> str:
    return _create_token(
        subject, "access", timedelta(minutes=settings.access_ttl_minutes), settings
    )


def create_refresh_token(subject: str, settings: AuthSettings) -> str:
    return _create_token(subject, "refresh", timedelta(days=settings.refresh_ttl_days), settings)


def create_guest_token(subject: str, settings: AuthSettings, ttl_seconds: int) -> str:
    return _create_token(subject, "guest", timedelta(seconds=ttl_seconds), settings)


def decode_token(token: str, expected_type: TokenType, settings: AuthSettings) -> str:
    """Validate signature, expiry, and type; return the subject (user id)."""

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as error:
        raise InvalidTokenError(str(error)) from error

    if payload.get("type") != expected_type:
        raise InvalidTokenError(f"Expected {expected_type} token")

    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise InvalidTokenError("Token missing subject")

    return subject
