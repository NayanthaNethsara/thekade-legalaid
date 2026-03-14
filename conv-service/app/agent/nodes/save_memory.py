"""Save conversation memory to Redis at the end of the pipeline.

Persists both the user message and the assistant reply into the Redis
transcript cache. Also saves/clears ``pending_follow_up`` for the next
turn's context resolution.
"""

import json

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


def _follow_up_key(thread_id: str) -> str:
    return f"pending_follow_up:{thread_id}"


async def save_memory_node(state: AgentState) -> dict:
    """Persist the current turn (user + assistant) and follow-up state."""

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
            # Collect tool names used in this turn.
            tool_calls: list[str] = []
            for tr in (state.get("tool_results") or []):
                if tr.get("success") and tr.get("tool_name"):
                    tool_calls.append(tr["tool_name"])

            await repo.append_message(
                thread_id,
                "assistant",
                final_response,
                {"tool_calls": tool_calls},
            )

        logger.info(f"[{thread_id}] save_memory: persisted turn to Redis")
    except Exception as exc:
        logger.error(f"[{thread_id}] save_memory: message save failed: {exc}")

    # ── Save or clear pending follow-up ──────────────────────────────────
    try:
        redis = RedisClient.get_instance()
        follow_up = state.get("pending_follow_up")

        if follow_up:
            await redis.set(
                _follow_up_key(thread_id),
                json.dumps(follow_up),
                ex=7 * 24 * 60 * 60,  # same TTL as conversation history
            )
            logger.info(f"[{thread_id}] save_memory: saved pending follow-up")
        else:
            # Clear any stale follow-up.
            await redis.delete(_follow_up_key(thread_id))
    except Exception as exc:
        logger.error(f"[{thread_id}] save_memory: follow-up save failed: {exc}")

    return {}
