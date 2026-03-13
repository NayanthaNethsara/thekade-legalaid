from app.core.config import settings
from app.core.nats import NatsService
from app.utils.logger import setup_logger
from app.utils.queue_messages import build_outgoing_text_message

logger = setup_logger(__name__)


class DocumentService:
    def __init__(self, nats_service: NatsService):
        self.nats_service = nats_service

    async def handle_message(self, message: dict) -> None:
        phone = message.get("from")
        file_url = message.get("fileUrl")
        filename = message.get("filename") or "document"

        if not phone:
            logger.warning("Dropping document message with no 'from' field")
            return

        if not file_url:
            logger.warning(f"Dropping document message from {phone} with no fileUrl")
            return

        logger.info(f"[{phone}] received document {filename}: {file_url}")
        await self.nats_service.send_message(
            settings.NATS_SUBJECT_OUTGOING_TEXT,
            build_outgoing_text_message(
                phone,
                f"I received your document '{filename}'. Document analysis will be handled on the document queue.",
            ),
        )