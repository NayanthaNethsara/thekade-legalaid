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

from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from app.agent.graph import create_graph
from app.agent.tools import load_mcp_tools
from app.core.nats import NatsService
from app.core.redis import RedisClient
from app.core.config import settings
from app.services import ConversationService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


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
        conversation_service = ConversationService(agent, nats_service, redis_client)

        # ------------------------------------------------------ consume loop
        try:
            async for _ in nats_service.consume_messages(conversation_service.handle_message):
                pass
        except KeyboardInterrupt:
            pass
        finally:
            await redis_client.close()
            await nats_service.stop()
            logger.info("Conversation service stopped")


if __name__ == "__main__":
    asyncio.run(main())
