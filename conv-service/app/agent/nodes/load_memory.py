"""Load conversation memory from Redis at the start of the pipeline.

This node makes the graph stateless — every invocation begins by
fetching the recent conversation transcript from the Redis cache so
downstream nodes have full context.
"""

from app.agent.state import AgentState
from app.core.redis import RedisClient
from app.repositories.redis.conversation import ConversationRedisRepository
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Re-use a module-level repository bound to the singleton Redis client.
_repo: ConversationRedisRepository | None = None


def _get_repo() -> ConversationRedisRepository:
    global _repo
    if _repo is None:
        _repo = ConversationRedisRepository(RedisClient.get_instance())
    return _repo


async def load_memory_node(state: AgentState) -> dict:
    """Fetch recent conversation messages from Redis and inject them."""
    thread_id: str = state["user_phone"]

    try:
        repo = _get_repo()
        recent = await repo.get_recent_messages(thread_id, limit=10)
        logger.info(
            f"[{thread_id}] load_memory: loaded {len(recent)} cached messages"
        )
    except Exception as exc:
        logger.error(f"[{thread_id}] load_memory failed: {exc}")
        recent = []

    return {"recent_messages": recent}
