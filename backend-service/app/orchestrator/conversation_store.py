from typing import Any

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.core.logging import get_logger
from app.schemas.chat import (
    ConversationDetail,
    MessageResponse,
)

logger = get_logger(__name__)


class ConversationStore:
    def __init__(self, checkpointer: AsyncPostgresSaver) -> None:
        self._checkpointer = checkpointer

    async def get_detail(self, thread_id: str) -> ConversationDetail | None:
        """Load one conversation's full history and running summary.

        Returns ``None`` when the thread has no checkpoint so the route can 404.
        """
        checkpoint_values = await self._checkpoint_values(thread_id)
        if checkpoint_values is None:
            return None
        return ConversationDetail(
            id=_conversation_id(thread_id),
            title=checkpoint_values.get("title") or "New chat",
            summary=checkpoint_values.get("summary") or "",
            messages=_history_from_rendered_turns(checkpoint_values.get("rendered_turns", [])),
        )

    async def delete(self, thread_id: str) -> bool:
        """Drop a thread's checkpoints; return whether the thread existed.

        ``adelete_thread`` removes the thread's rows from ``checkpoints``,
        ``checkpoint_blobs`` and ``checkpoint_writes``. We probe for a checkpoint
        first so callers can distinguish a real deletion from a no-op on an
        unknown id and surface a 404.
        """
        existed = await self._checkpoint_values(thread_id) is not None
        await self._checkpointer.adelete_thread(thread_id)
        logger.info("orchestrator.conversation_deleted", thread_id=thread_id, existed=existed)
        return existed

    async def _checkpoint_values(self, thread_id: str) -> dict[str, Any] | None:
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
        checkpoint_tuple = await self._checkpointer.aget_tuple(config)
        if not checkpoint_tuple:
            return None
        return checkpoint_tuple.checkpoint.get("channel_values", {})


def _conversation_id(thread_id: str) -> str:
    return thread_id.split(":", 2)[2]


def _history_from_rendered_turns(
    rendered_turns: list[dict[str, Any]],
) -> list[MessageResponse]:
    """Expand the stored rendered transcript into the client's message list.

    Each rendered turn already holds exactly what the customer saw, so this is a
    flat mapping with no reconstruction from raw execution messages. Empty
    user/reply strings are skipped so an absent side of a turn does not surface a
    blank bubble. Turn IDs are positional and stable for a given transcript.
    """
    history: list[MessageResponse] = []
    for index, turn in enumerate(rendered_turns):
        user_text = (turn.get("user") or "").strip()
        if user_text:
            history.append(MessageResponse(id=f"u{index}", role="user", content=user_text))
        reply_text = (turn.get("reply") or "").strip()
        if reply_text:
            history.append(
                MessageResponse(
                    id=f"a{index}",
                    role="assistant",
                    content=reply_text,
                    cards=turn.get("cards") or [],
                    actions=turn.get("actions") or [],
                )
            )
    return history
