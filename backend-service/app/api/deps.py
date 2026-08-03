import secrets
import uuid
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security.tokens import InvalidTokenError, decode_token
from app.db.redis import get_redis
from app.db.session import get_session, get_sessionmaker
from app.models.user import User
from app.repositories.customer_memory_repository import CustomerMemoryRepository
from app.repositories.customer_profile_repository import CustomerProfileRepository
from app.repositories.guest_repository import GuestRepository
from app.repositories.note_repository import NoteRepository
from app.repositories.reminder_repository import ReminderRepository
from app.repositories.source_repository import SourceRepository
from app.repositories.user_repository import UserRepository
from app.schemas.guest import GuestRecord
from app.services.auth_service import AuthService
from app.services.errors import GuestNotFoundError
from app.services.guest_service import GuestService

_bearer = HTTPBearer(auto_error=True)


def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRepository:
    return UserRepository(session)


def get_redis_client() -> Redis:
    return get_redis()


def get_auth_service(
    users: Annotated[UserRepository, Depends(get_user_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(users, settings.auth)


def get_customer_profile_repository(
    redis: Annotated[Redis, Depends(get_redis_client)],
) -> CustomerProfileRepository:
    return CustomerProfileRepository(get_sessionmaker(), redis)


def get_customer_memory_repository(
    redis: Annotated[Redis, Depends(get_redis_client)],
) -> CustomerMemoryRepository:
    return CustomerMemoryRepository(get_sessionmaker(), redis)


def get_guest_repository(
    redis: Annotated[Redis, Depends(get_redis_client)],
) -> GuestRepository:
    return GuestRepository(redis)


def get_source_repository() -> SourceRepository:
    return SourceRepository(get_sessionmaker())


def get_note_repository() -> NoteRepository:
    return NoteRepository(get_sessionmaker())


def get_reminder_repository() -> ReminderRepository:
    return ReminderRepository(get_sessionmaker())


def get_guest_service(
    guests: Annotated[GuestRepository, Depends(get_guest_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GuestService:
    return GuestService(guests, settings.auth)


def require_internal_key(
    settings: Annotated[Settings, Depends(get_settings)],
    x_internal_key: Annotated[str | None, Header()] = None,
) -> None:
    """Reject any caller that is not our own frontend.

    The frontend server holds `INTERNAL_API_KEY` and sends it on guest calls;
    the browser never sees it, so guest endpoints stay frontend-only.
    """

    if not x_internal_key or not secrets.compare_digest(x_internal_key, settings.internal_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing internal key"
        )


async def get_current_guest(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    guests: Annotated[GuestService, Depends(get_guest_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GuestRecord:
    try:
        guest_id = decode_token(credentials.credentials, "guest", settings.auth)
    except InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired guest token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    try:
        return await guests.resolve_guest(guest_id)
    except GuestNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Guest session expired"
        ) from error


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    users: Annotated[UserRepository, Depends(get_user_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    try:
        subject = decode_token(credentials.credentials, "access", settings.auth)
        user_id = uuid.UUID(subject)
    except (InvalidTokenError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    user = await users.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@dataclass(frozen=True)
class Principal:
    """The authenticated caller of a channel shared by users and guests (chat)."""

    kind: Literal["user", "guest"]
    id: str
    display_name: str | None
    # Cross-feature customer key (profiles, memory): phone for WhatsApp
    # accounts, user id for web accounts, None for guests.
    identity: str | None = None


async def get_principal(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    users: Annotated[UserRepository, Depends(get_user_repository)],
    guests: Annotated[GuestService, Depends(get_guest_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Principal:
    """Resolve the bearer to a user (access token) or a guest (guest token)."""

    token = credentials.credentials

    try:
        subject = decode_token(token, "access", settings.auth)
        user = await users.get_by_id(uuid.UUID(subject))
        if user is not None:
            return Principal(
                kind="user",
                id=str(user.id),
                display_name=user.display_name,
                identity=user.identity,
            )
    except (InvalidTokenError, ValueError):
        pass

    try:
        guest = await guests.resolve_guest(decode_token(token, "guest", settings.auth))
        return Principal(kind="guest", id=guest.id, display_name=guest.display_name, identity=None)
    except (InvalidTokenError, GuestNotFoundError):
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
