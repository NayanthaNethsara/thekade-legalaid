"""Entry point for the LegalAid conversation service.

Flow:
  WhatsApp gateway  →  NATS (whatsapp.incoming.messages)
                    →  LangGraph agent  (Gemini + MCP tools)
                    →  NATS (whatsapp.outgoing.messages)
                    →  WhatsApp gateway  →  user

Conversation memory is kept per-user (phone number = thread_id) using
LangGraph's MemorySaver (in-process for now; swap for RedisSaver in prod).
"""

import asyncio
from typing import Optional

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from app.agent.graph import create_graph
from app.agent.tools import load_mcp_tools
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.nats import NatsService
from app.core.redis import RedisClient
from app.repositories.redis.user import UserRedisRepository
from app.repositories.user import UserRepository
from app.services.user import UserService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def _extract_text(message: dict) -> Optional[str]:
    """Pull the user's text out of a WhatsApp message payload.

    The gateway (NestJS) wraps everything under a 'content' field:
      { type: "text", content: { text: "hi" }, from: "...", ... }
    """
    msg_type = message.get("type", "")
    content = message.get("content", {})

    if msg_type == "text":
        # Gateway format: content.text
        # Fallback: raw WhatsApp API shape (text.body / body)
        body = (
            content.get("text")
            or message.get("text", {}).get("body")
            or message.get("body", "")
        )
        return body.strip() or None

    if msg_type == "interactive":
        # Gateway format: content.interactive.buttonReply / listReply
        interactive = content.get("interactive", {}) or message.get("interactive", {})
        title = (
            interactive.get("buttonReply", {}).get("title")
            or interactive.get("listReply", {}).get("title")
            or interactive.get("button_reply", {}).get("title")
            or interactive.get("list_reply", {}).get("title")
        )
        return title.strip() if title else None

    return None


async def main():
    # ---------------------------------------------------------------- startup
    logger.info("Starting LegalAid conversation service")

    tools = await load_mcp_tools()
    graph_builder = create_graph(tools)

    # Redis-backed checkpointer — persists conversation history per user (thread_id = phone)
    async with AsyncRedisSaver.from_conn_string(settings.REDIS_URL) as checkpointer:
        agent = graph_builder.compile(checkpointer=checkpointer)

        nats_service = NatsService()
        await nats_service.start()

        redis_client = RedisClient.get_instance()

        # ------------------------------------------------------ message handler

        async def handle_message(message: dict):
            phone: Optional[str] = message.get("from")
            if not phone:
                logger.warning("Dropping message with no 'from' field")
                return

            text = _extract_text(message)
            if not text:
                logger.info(f"Ignoring non-text message from {phone}")
                return

            # Upsert user record
            with SessionLocal() as db:
                user_repo = UserRepository(db)
                user_redis_repo = UserRedisRepository(redis_client)
                user_service = UserService(user_repo, user_redis_repo)
                user = await user_service.get_user_by_phone(phone)
                if not user:
                    user = await user_service.create_user(phone)
                user_id = str(user.id)

            logger.info(f"[{phone}] → {text[:100]}")

            # Each phone number gets its own conversation thread
            config = {"configurable": {"thread_id": phone}}
            state = {
                "messages": [HumanMessage(content=text)],
                "user_phone": phone,
                "user_id": user_id,
            }

            result = await agent.ainvoke(state, config=config)

            # Last AIMessage is the reply
            ai_messages = [
                m for m in result["messages"]
                if isinstance(m, AIMessage) and m.content
            ]
            if not ai_messages:
                logger.warning(f"Agent produced no reply for {phone}")
                return

            reply = ai_messages[-1].content
            await nats_service.send_message(
                settings.NATS_SUBJECT_OUTGOING,
                {"to": phone, "type": "text", "text": reply},
            )
            logger.info(f"[{phone}] ← {str(reply)[:100]}")

        # ------------------------------------------------------ consume loop
        try:
            async for _ in nats_service.consume_messages(handle_message):
                pass
        except KeyboardInterrupt:
            pass
        finally:
            await redis_client.close()
            await nats_service.stop()
            logger.info("Conversation service stopped")


if __name__ == "__main__":
    asyncio.run(main())
