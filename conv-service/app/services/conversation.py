"""Conversation service — bridges NATS messages to the agent pipeline.

User registration and status checking now happen inside the graph's
``onboarding`` node, so this service simply extracts the phone/text from
the incoming queue payload and delegates to the orchestrator.
"""

from typing import Any, Optional

from app.core.config import settings
from app.core.nats import NatsService
from app.core.redis import RedisClient
from app.services.chat_orchestrator import ChatOrchestrator
from app.utils.logger import setup_logger
from app.utils.queue_messages import build_outgoing_text_message, extract_incoming_text

logger = setup_logger(__name__)


class ConversationService:
    def __init__(self, agent: Any, nats_service: NatsService, redis_client: RedisClient):
        self.agent = agent
        self.nats_service = nats_service
        self.redis_client = redis_client
        self.chat_orchestrator = ChatOrchestrator(agent)

    async def handle_message(self, message: dict) -> None:
        phone: Optional[str] = message.get("from")
        if not phone:
            logger.warning("Dropping message with no 'from' field")
            return

        text = extract_incoming_text(message)
        if not text:
            logger.info(f"Ignoring non-text message from {phone}")
            return

        logger.info(f"[{phone}] → {text[:100]}")

        reply = await self.chat_orchestrator.run(
            thread_id=phone,
            user_id=None,  # resolved by onboarding node
            text=text,
        )
        if not reply:
            logger.warning(f"Agent produced no reply for {phone}")
            return

        await self.nats_service.send_message(
            settings.NATS_SUBJECT_OUTGOING_TEXT,
            build_outgoing_text_message(phone, reply),
        )
        logger.info(f"[{phone}] ← {reply[:100]}")