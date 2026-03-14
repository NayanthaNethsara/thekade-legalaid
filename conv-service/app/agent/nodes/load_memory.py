"""Load conversation memory from Redis at the start of the pipeline.

This node makes the graph stateless — every invocation begins by
fetching the recent conversation transcript AND any pending follow-up
context from the Redis cache.
"""

import json

from app.agent.state import AgentState
from app.core.redis import RedisClient
from app.repositories.redis.conversation import ConversationRedisRepository
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

_repo: ConversationRedisRepository | None = None


def _get_repo() -> ConversationRedisRepository:
    global _repo
    if _repo is None:
        _repo = ConversationRedisRepository(RedisClient.get_instance())
    return _repo


def _follow_up_key(thread_id: str) -> str:
    return f"pending_follow_up:{thread_id}"


async def load_memory_node(state: AgentState) -> dict:
    """Fetch recent conversation messages and pending follow-up from Redis."""
    thread_id: str = state["user_phone"]

    try:
        repo = _get_repo()
        recent = await repo.get_recent_messages(thread_id, limit=10)
        logger.info(
            f"[{thread_id}] load_memory: loaded {len(recent)} cached messages"
        )
    except Exception as exc:
        logger.error(f"[{thread_id}] load_memory: history failed: {exc}")
        recent = []

    # Load pending follow-up from Redis.
    pending_follow_up = None
    try:
        redis = RedisClient.get_instance()
        raw = await redis.get(_follow_up_key(thread_id))
        if raw:
            pending_follow_up = json.loads(raw)
            logger.info(f"[{thread_id}] load_memory: loaded pending follow-up")
    except Exception as exc:
        logger.error(f"[{thread_id}] load_memory: follow-up failed: {exc}")

    return {
        "recent_messages": recent,
        "pending_follow_up": pending_follow_up,
    }
