import uuid
from typing import NamedTuple

from starlette.concurrency import run_in_threadpool

from app.core.config import AuthSettings
from app.core.logging import get_logger
from app.core.security.firebase import InvalidFirebaseTokenError, verify_firebase_id_token
from app.core.security.phone import normalize_phone
from app.core.security.tokens import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.errors import InvalidCredentialsError

logger = get_logger(__name__)


class TokenPair(NamedTuple):
    access_token: str
    refresh_token: str


class AuthService:
    """Business rules for the two separate account kinds.

    Web accounts come from Google sign-in: the frontend obtains a Firebase ID
    token, this service verifies it and issues the backend's own JWTs. WhatsApp
    accounts are auto-created from inbound messages and never sign in on the
    web; the two kinds never merge.
    """

    def __init__(self, users: UserRepository, settings: AuthSettings) -> None:
        self._users = users
        self._settings = settings

    async def sign_in_with_google(self, id_token: str) -> TokenPair:
        """Verify a Firebase ID token and upsert the matching web account.

        Verification fetches Google's signing certificates, a blocking call,
        so it runs in the threadpool.
        """

        try:
            identity = await run_in_threadpool(
                verify_firebase_id_token, id_token, self._settings.firebase_project_id
            )
        except InvalidFirebaseTokenError as error:
            raise InvalidCredentialsError(str(error)) from error

        user = await self._users.get_by_firebase_uid(identity.uid)
        if user is None:
            user = User(
                firebase_uid=identity.uid,
                email=identity.email,
                display_name=identity.display_name,
                source="web",
            )
            self._users.add(user)
            logger.info("auth.web_registered", firebase_uid=identity.uid)
        else:
            # Google is the source of truth for these fields; keep them fresh.
            user.email = identity.email or user.email
            user.display_name = identity.display_name or user.display_name

        await self._users.commit()
        await self._users.refresh(user)
        logger.info("auth.google_signin", user_id=str(user.id))
        return self._issue_tokens(user)

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            subject = decode_token(refresh_token, "refresh", self._settings)
        except InvalidTokenError as error:
            raise InvalidCredentialsError(str(error)) from error

        # The user may have been deleted since the token was issued; a valid
        # signature alone must not mint access for an account that no longer
        # exists, or the session looks alive to the gate but dead to /auth/me.
        try:
            user_id = uuid.UUID(subject)
        except ValueError as error:
            raise InvalidCredentialsError(subject) from error
        if await self._users.get_by_id(user_id) is None:
            raise InvalidCredentialsError(subject)

        access = create_access_token(subject, self._settings)
        return TokenPair(access_token=access, refresh_token=refresh_token)

    async def ensure_whatsapp_user(self, phone: str, name: str | None) -> User:
        """Upsert the sender of an inbound WhatsApp message.

        Idempotent: safe to call on every message and on JetStream redelivery.
        """

        canonical = normalize_phone(phone, self._settings.default_country_code)
        user = await self._users.get_by_phone(canonical)
        if user is not None:
            if name and not user.display_name:
                user.display_name = name
                await self._users.commit()
            return user

        user = User(
            phone=canonical,
            display_name=name,
            source="whatsapp",
        )
        self._users.add(user)
        await self._users.commit()
        await self._users.refresh(user)
        logger.info("auth.whatsapp_registered", phone=canonical)
        return user

    def _issue_tokens(self, user: User) -> TokenPair:
        subject = str(user.id)
        return TokenPair(
            access_token=create_access_token(subject, self._settings),
            refresh_token=create_refresh_token(subject, self._settings),
        )
