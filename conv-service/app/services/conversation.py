from typing import Any, Optional

from langchain_core.messages import AIMessage, HumanMessage

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.nats import NatsService
from app.core.redis import RedisClient
from app.repositories.redis.user import UserRedisRepository
from app.repositories.user import UserRepository
from app.services.user import UserService
from app.utils.logger import setup_logger
from app.utils.queue_messages import build_outgoing_text_message, extract_incoming_text

logger = setup_logger(__name__)


class ConversationService:
    def __init__(self, agent: Any, nats_service: NatsService, redis_client: RedisClient):
        self.agent = agent
        self.nats_service = nats_service
        self.redis_client = redis_client

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

        config = {"configurable": {"thread_id": phone}}
        state = {
            "messages": [HumanMessage(content=text)],
            "user_phone": phone,
            "user_id": user_id,
        }

        result = await self.agent.ainvoke(state, config=config)

        ai_messages = [
            message_item
            for message_item in result["messages"]
            if isinstance(message_item, AIMessage) and message_item.content
        ]
        if not ai_messages:
            logger.warning(f"Agent produced no reply for {phone}")
            return

        reply = str(ai_messages[-1].content)
        await self.nats_service.send_message(
            settings.NATS_SUBJECT_OUTGOING,
            build_outgoing_text_message(phone, reply),
        )
        logger.info(f"[{phone}] ← {reply[:100]}")