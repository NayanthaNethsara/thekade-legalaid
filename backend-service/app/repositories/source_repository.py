import uuid
from typing import Any, cast

from sqlalchemy import CursorResult, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.source import Source
from app.schemas.source import SourceKind, SourceResponse


def _to_response(row: Source) -> SourceResponse:
    return SourceResponse(
        id=row.id,
        conversation_id=row.conversation_id,
        kind=cast(SourceKind, row.kind),
        name=row.name,
        size=row.size,
        content_type=row.content_type,
        url=row.url,
        is_selected=row.is_selected,
        added_at=row.created_at,
    )


class SourceRepository:
    """Workspace sources scoped to a principal and conversation.

    Every read and mutation filters on the principal columns so one principal
    can never address another principal's rows.
    """

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def create(
        self,
        principal_kind: str,
        principal_id: str,
        conversation_id: str,
        kind: SourceKind,
        name: str,
        size: int,
        content_type: str,
        url: str | None,
        content: str | None,
    ) -> SourceResponse:
        row = Source(
            id=uuid.uuid4().hex,
            principal_kind=principal_kind,
            principal_id=principal_id,
            conversation_id=conversation_id,
            kind=kind,
            name=name,
            size=size,
            content_type=content_type,
            url=url,
            is_selected=True,
            content=content,
        )
        async with self._sessionmaker() as session:
            session.add(row)
            await session.commit()
            await session.refresh(row)
        return _to_response(row)

    async def list_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> list[SourceResponse]:
        async with self._sessionmaker() as session:
            result = await session.scalars(
                select(Source)
                .where(
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                    Source.conversation_id == conversation_id,
                )
                .order_by(Source.created_at.desc())
            )
            return [_to_response(row) for row in result.all()]

    async def count_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> int:
        async with self._sessionmaker() as session:
            count = await session.scalar(
                select(func.count())
                .select_from(Source)
                .where(
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                    Source.conversation_id == conversation_id,
                )
            )
            return int(count or 0)

    async def get_many_with_content(
        self,
        source_ids: list[str],
        principal_kind: str,
        principal_id: str,
        conversation_id: str,
    ) -> list[tuple[SourceResponse, str | None]]:
        """Resolve owned sources by id, returning each with its extracted text."""
        if not source_ids:
            return []
        async with self._sessionmaker() as session:
            result = await session.scalars(
                select(Source).where(
                    Source.id.in_(source_ids),
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                    Source.conversation_id == conversation_id,
                )
            )
            return [(_to_response(row), row.content) for row in result.all()]

    async def get_content(
        self, source_id: str, principal_kind: str, principal_id: str
    ) -> tuple[str, str | None] | None:
        """Return ``(name, content)`` for one owned source, or None if absent."""
        async with self._sessionmaker() as session:
            row = await session.scalar(
                select(Source).where(
                    Source.id == source_id,
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                )
            )
            if row is None:
                return None
            return (row.name, row.content)

    async def set_selected(
        self, source_id: str, principal_kind: str, principal_id: str, is_selected: bool
    ) -> SourceResponse | None:
        async with self._sessionmaker() as session:
            row = await session.scalar(
                select(Source).where(
                    Source.id == source_id,
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                )
            )
            if row is None:
                return None
            row.is_selected = is_selected
            await session.commit()
            await session.refresh(row)
            return _to_response(row)

    async def set_all_selected(
        self,
        principal_kind: str,
        principal_id: str,
        conversation_id: str,
        is_selected: bool,
    ) -> list[SourceResponse]:
        async with self._sessionmaker() as session:
            await session.execute(
                update(Source)
                .where(
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                    Source.conversation_id == conversation_id,
                )
                .values(is_selected=is_selected)
            )
            await session.commit()
        return await self.list_for_conversation(principal_kind, principal_id, conversation_id)

    async def delete(self, source_id: str, principal_kind: str, principal_id: str) -> bool:
        async with self._sessionmaker() as session:
            result = await session.execute(
                delete(Source).where(
                    Source.id == source_id,
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                )
            )
            await session.commit()
            return bool(cast(CursorResult[Any], result).rowcount)

    async def delete_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> None:
        async with self._sessionmaker() as session:
            await session.execute(
                delete(Source).where(
                    Source.principal_kind == principal_kind,
                    Source.principal_id == principal_id,
                    Source.conversation_id == conversation_id,
                )
            )
            await session.commit()
