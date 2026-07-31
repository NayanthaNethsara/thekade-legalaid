from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.conversation_index import ConversationIndex
from app.schemas.chat import ConversationSummary

_DEFAULT_LIST_LIMIT = 100


class ConversationIndexRepository:
    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def upsert(
        self, thread_id: str, principal_kind: str, principal_id: str, title: str | None
    ) -> None:
        """Record the thread and bump its recency. A null ``title`` (early turns
        before one is derived) never clobbers a title already stored."""
        async with self._sessionmaker() as session:
            stmt = insert(ConversationIndex).values(
                thread_id=thread_id,
                principal_kind=principal_kind,
                principal_id=principal_id,
                title=title,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["thread_id"],
                set_={
                    "title": func.coalesce(stmt.excluded.title, ConversationIndex.title),
                    "updated_at": func.now(),
                },
            )
            await session.execute(stmt)
            await session.commit()

    async def list_for_principal(
        self, principal_kind: str, principal_id: str, limit: int = _DEFAULT_LIST_LIMIT
    ) -> list[ConversationSummary]:
        async with self._sessionmaker() as session:
            result = await session.execute(
                select(ConversationIndex.thread_id, ConversationIndex.title)
                .where(
                    ConversationIndex.principal_kind == principal_kind,
                    ConversationIndex.principal_id == principal_id,
                )
                .order_by(ConversationIndex.updated_at.desc())
                .limit(limit)
            )
        return [
            ConversationSummary(id=_conversation_id(thread_id), title=title or "New chat")
            for thread_id, title in result.all()
        ]

    async def delete(self, thread_id: str) -> None:
        async with self._sessionmaker() as session:
            await session.execute(
                delete(ConversationIndex).where(ConversationIndex.thread_id == thread_id)
            )
            await session.commit()


def _conversation_id(thread_id: str) -> str:
    return thread_id.split(":", 2)[2]
