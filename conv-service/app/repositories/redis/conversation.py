import json
from datetime import UTC, datetime
from typing import Any

from app.core.redis import RedisClient
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ConversationRedisRepository:
    def __init__(self, redis_client: RedisClient):
        self.redis = redis_client
        self.key_prefix = "conversation_history"
        self.ttl_seconds = 7 * 24 * 60 * 60
        self.max_messages = 50

    def _history_key(self, thread_id: str) -> str:
        return f"{self.key_prefix}:{thread_id}"

    async def append_message(
        self,
        thread_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not content.strip():
            return

        payload = json.dumps(
            {
                "role": role,
                "content": content,
                "metadata": metadata or {},
                "created_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            }
        )
        key = self._history_key(thread_id)

        try:
            await self.redis.lpush(key, payload)
            await self.redis.ltrim(key, 0, self.max_messages - 1)
            await self.redis.expire(key, self.ttl_seconds)
        except Exception as exc:
            logger.error(f"Failed to append cached conversation message for {thread_id}: {exc}")

    async def get_recent_messages(self, thread_id: str, limit: int = 10) -> list[dict[str, Any]]:
        key = self._history_key(thread_id)

        try:
            items = await self.redis.lrange(key, 0, max(limit - 1, 0))
        except Exception as exc:
            logger.error(f"Failed to load cached conversation history for {thread_id}: {exc}")
            return []

        messages: list[dict[str, Any]] = []
        for raw_item in reversed(items):
            try:
                messages.append(json.loads(raw_item))
            except json.JSONDecodeError:
                logger.warning(f"Skipping invalid cached conversation message for {thread_id}")

        return messages