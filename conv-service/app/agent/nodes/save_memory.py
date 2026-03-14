"""Save conversation memory to Redis at the end of the pipeline.

Persists both the user message and the assistant reply into the Redis
transcript cache so future invocations have context.
"""

from langchain_core.messages import HumanMessage

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


async def save_memory_node(state: AgentState) -> dict:
    """Persist the current turn (user + assistant) to Redis cache."""

    thread_id: str = state["user_phone"]
    user_id: str | None = state.get("user_id")
    final_response: str | None = state.get("final_response")

    # Extract the user text from messages.
    user_text = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            user_text = msg.content if isinstance(msg.content, str) else str(msg.content)
            break

    repo = _get_repo()

    try:
        if user_text:
            await repo.append_message(
                thread_id, "user", user_text, {"user_id": user_id}
            )

        if final_response:
            tool_calls: list[str] = []
            if state.get("tool_name"):
                tool_calls.append(state["tool_name"])

            await repo.append_message(
                thread_id,
                "assistant",
                final_response,
                {"tool_calls": tool_calls},
            )

        logger.info(f"[{thread_id}] save_memory: persisted turn to Redis")
    except Exception as exc:
        logger.error(f"[{thread_id}] save_memory failed: {exc}")

    # No state mutations needed — this is the terminal data node.
    return {}
