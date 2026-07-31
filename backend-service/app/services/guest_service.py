import uuid
from datetime import UTC, datetime

from app.core.config import AuthSettings
from app.core.logging import get_logger
from app.core.security.tokens import create_guest_token
from app.repositories.guest_repository import GuestRepository
from app.schemas.guest import GuestRecord, GuestResponse, GuestSessionResponse
from app.services.errors import GuestNotFoundError

logger = get_logger(__name__)


class GuestService:
    """Anonymous visitor sessions: short-lived, Redis-backed identities.

    A guest is just a signed token plus a Redis record with a TTL, so the chat
    layer can attribute messages to a visitor without requiring an account.
    """

    def __init__(self, guests: GuestRepository, settings: AuthSettings) -> None:
        self._guests = guests
        self._settings = settings

    async def create_guest(self, display_name: str | None) -> GuestSessionResponse:
        ttl = self._settings.guest_ttl_seconds
        record = GuestRecord(
            id=str(uuid.uuid4()),
            display_name=display_name,
            created_at=datetime.now(UTC),
        )
        await self._guests.create(record, ttl)
        token = create_guest_token(record.id, self._settings, ttl)
        logger.info("guest.created", guest_id=record.id)
        return GuestSessionResponse(
            guest_token=token,
            guest=GuestResponse(id=record.id, display_name=record.display_name),
            expires_in=ttl,
        )

    async def resolve_guest(self, guest_id: str) -> GuestRecord:
        record = await self._guests.get(guest_id)
        if record is None:
            raise GuestNotFoundError(guest_id)
        return record
