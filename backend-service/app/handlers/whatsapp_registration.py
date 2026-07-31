from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import AuthSettings
from app.core.logging import get_logger
from app.core.security.phone import InvalidPhoneError
from app.messaging.schemas import IncomingMessage
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

logger = get_logger(__name__)


class WhatsAppRegistrar:
    """Auto-registers the sender of every inbound WhatsApp message.

    Runs before business handling so a first-time WhatsApp user has an account by
    the time any reply logic executes. Opens its own short-lived session per
    message because the NATS consumer runs outside the HTTP request lifecycle.
    """

    def __init__(
        self,
        sessionmaker: async_sessionmaker[AsyncSession],
        auth_settings: AuthSettings,
    ) -> None:
        self._sessionmaker = sessionmaker
        self._auth_settings = auth_settings

    async def ensure_user(self, message: IncomingMessage) -> str | None:
        try:
            async with self._sessionmaker() as session:
                service = AuthService(UserRepository(session), self._auth_settings)
                user = await service.ensure_whatsapp_user(message.from_, message.contact_name)
                return str(user.id)
        except InvalidPhoneError:
            # A malformed sender number must not block message processing.
            logger.warning("registrar.invalid_phone", from_=message.from_)
            return None
