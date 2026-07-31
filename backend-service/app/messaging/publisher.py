from app.core.config import NatsSettings
from app.core.logging import clip, get_logger
from app.messaging.nats_client import NatsClient
from app.messaging.schemas import OutgoingMessage, OutgoingTextMessage

logger = get_logger(__name__)


class OutgoingPublisher:
    """Publishes outgoing messages the whatsapp-gateway relays to WhatsApp."""

    def __init__(self, client: NatsClient, settings: NatsSettings) -> None:
        self._client = client
        self._subject = settings.subject_outgoing

    async def send(self, message: OutgoingMessage) -> None:
        payload = message.model_dump_json(by_alias=True, exclude_none=True)
        await self._client.jetstream.publish(self._subject, payload.encode())
        logger.info(
            "outgoing.published",
            to=message.to,
            type=message.type,
            subject=self._subject,
            payload=clip(payload, 2000),
        )

    async def send_text(self, message: OutgoingTextMessage) -> None:
        await self.send(message)
