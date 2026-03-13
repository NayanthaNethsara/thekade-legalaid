from typing import Any, Optional

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.nats import NatsService
from app.core.redis import RedisClient
from app.repositories.redis.conversation import ConversationRedisRepository
from app.repositories.redis.user import UserRedisRepository
from app.repositories.user import UserRepository
from app.services.chat_orchestrator import ChatOrchestrator
from app.services.user import UserService
from app.utils.logger import setup_logger
from app.utils.queue_messages import build_outgoing_text_message, extract_incoming_text

logger = setup_logger(__name__)


class ConversationService:
    def __init__(self, agent: Any, nats_service: NatsService, redis_client: RedisClient):
        self.agent = agent
        self.nats_service = nats_service
        self.redis_client = redis_client
        self.chat_orchestrator = ChatOrchestrator(
            agent,
            ConversationRedisRepository(redis_client),
        )

    async def _get_or_create_user_id(self, phone: str) -> str:
        with SessionLocal() as db:
            user_repo = UserRepository(db)
            user_redis_repo = UserRedisRepository(self.redis_client)
            user_service = UserService(user_repo, user_redis_repo)
            user = await user_service.get_user_by_phone(phone)
            if not user:
                user = await user_service.create_user(phone)
            return str(user.id)

    async def handle_message(self, message: dict) -> None:
        phone: Optional[str] = message.get("from")
        if not phone:
            logger.warning("Dropping message with no 'from' field")
            return

        text = extract_incoming_text(message)
        if not text:
            logger.info(f"Ignoring non-text message from {phone}")
            return

        user_id = await self._get_or_create_user_id(phone)

        logger.info(f"[{phone}] → {text[:100]}")

        reply = await self.chat_orchestrator.run(
            thread_id=phone,
            user_id=user_id,
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