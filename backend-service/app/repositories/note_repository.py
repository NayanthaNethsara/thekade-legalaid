import uuid
from typing import Any, cast

from sqlalchemy import CursorResult, delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.note import Note
from app.schemas.note import NoteResponse


def _to_response(row: Note) -> NoteResponse:
    return NoteResponse(
        id=row.id,
        conversation_id=row.conversation_id,
        content=row.content,
        updated_at=row.updated_at,
    )


class NoteRepository:
    """Workspace notes scoped to a principal and conversation."""

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def create(
        self, principal_kind: str, principal_id: str, conversation_id: str, content: str
    ) -> NoteResponse:
        row = Note(
            id=uuid.uuid4().hex,
            principal_kind=principal_kind,
            principal_id=principal_id,
            conversation_id=conversation_id,
            content=content,
        )
        async with self._sessionmaker() as session:
            session.add(row)
            await session.commit()
            await session.refresh(row)
        return _to_response(row)

    async def list_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> list[NoteResponse]:
        async with self._sessionmaker() as session:
            result = await session.scalars(
                select(Note)
                .where(
                    Note.principal_kind == principal_kind,
                    Note.principal_id == principal_id,
                    Note.conversation_id == conversation_id,
                )
                .order_by(Note.created_at.desc())
            )
            return [_to_response(row) for row in result.all()]

    async def update_content(
        self, note_id: str, principal_kind: str, principal_id: str, content: str
    ) -> NoteResponse | None:
        async with self._sessionmaker() as session:
            row = await session.scalar(
                select(Note).where(
                    Note.id == note_id,
                    Note.principal_kind == principal_kind,
                    Note.principal_id == principal_id,
                )
            )
            if row is None:
                return None
            row.content = content
            await session.commit()
            await session.refresh(row)
            return _to_response(row)

    async def delete(self, note_id: str, principal_kind: str, principal_id: str) -> bool:
        async with self._sessionmaker() as session:
            result = await session.execute(
                delete(Note).where(
                    Note.id == note_id,
                    Note.principal_kind == principal_kind,
                    Note.principal_id == principal_id,
                )
            )
            await session.commit()
            return bool(cast(CursorResult[Any], result).rowcount)

    async def delete_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> None:
        async with self._sessionmaker() as session:
            await session.execute(
                delete(Note).where(
                    Note.principal_kind == principal_kind,
                    Note.principal_id == principal_id,
                    Note.conversation_id == conversation_id,
                )
            )
            await session.commit()
