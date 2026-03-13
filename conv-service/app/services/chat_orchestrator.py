from typing import Any

from langchain_core.messages import AIMessage, ToolMessage

from app.repositories.redis.conversation import ConversationRedisRepository
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ChatOrchestrator:
    def __init__(self, agent: Any, conversation_cache: ConversationRedisRepository):
        self.agent = agent
        self.conversation_cache = conversation_cache

    async def run(self, *, thread_id: str, user_id: str, text: str) -> str | None:
        cached_messages = await self.conversation_cache.get_recent_messages(thread_id)
        logger.info(f"[{thread_id}] cached history size={len(cached_messages)}")

        result = await self.agent.ainvoke(
            {
                "messages": [("user", text)],
                "user_phone": thread_id,
                "user_id": user_id,
                "recent_messages": cached_messages,
            },
            config={"configurable": {"thread_id": thread_id}},
        )

        reply = self._extract_reply(result.get("messages", []))
        tool_calls = self._extract_tool_call_names(result.get("messages", []))

        await self.conversation_cache.append_message(
            thread_id,
            "user",
            text,
            {"user_id": user_id},
        )

        if reply:
            await self.conversation_cache.append_message(
                thread_id,
                "assistant",
                reply,
                {"tool_calls": tool_calls},
            )

        return reply

    def _extract_reply(self, messages: list[Any]) -> str | None:
        for message in reversed(messages):
            if isinstance(message, AIMessage) and isinstance(message.content, str) and message.content.strip():
                return message.content.strip()
        return None

    def _extract_tool_call_names(self, messages: list[Any]) -> list[str]:
        tool_names: list[str] = []
        for message in messages:
            if isinstance(message, AIMessage):
                for tool_call in getattr(message, "tool_calls", []) or []:
                    name = tool_call.get("name")
                    if isinstance(name, str) and name:
                        tool_names.append(name)
            elif isinstance(message, ToolMessage) and message.name:
                tool_names.append(message.name)
        return tool_names