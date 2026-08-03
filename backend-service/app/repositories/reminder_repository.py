import datetime
import uuid
from typing import Any, cast

from sqlalchemy import CursorResult, delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.reminder import Reminder
from app.schemas.reminder import ReminderResponse


def _to_response(row: Reminder) -> ReminderResponse:
    return ReminderResponse(
        id=row.id,
        conversation_id=row.conversation_id,
        title=row.title,
        due_date=row.due_date,
        is_done=row.is_done,
    )


class ReminderRepository:
    """Workspace reminders scoped to a principal and conversation."""

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def create(
        self,
        principal_kind: str,
        principal_id: str,
        conversation_id: str,
        title: str,
        due_date: datetime.date | None,
    ) -> ReminderResponse:
        row = Reminder(
            id=uuid.uuid4().hex,
            principal_kind=principal_kind,
            principal_id=principal_id,
            conversation_id=conversation_id,
            title=title,
            due_date=due_date,
            is_done=False,
        )
        async with self._sessionmaker() as session:
            session.add(row)
            await session.commit()
            await session.refresh(row)
        return _to_response(row)

    async def list_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> list[ReminderResponse]:
        async with self._sessionmaker() as session:
            result = await session.scalars(
                select(Reminder)
                .where(
                    Reminder.principal_kind == principal_kind,
                    Reminder.principal_id == principal_id,
                    Reminder.conversation_id == conversation_id,
                )
                .order_by(Reminder.created_at.desc())
            )
            return [_to_response(row) for row in result.all()]

    async def update(
        self,
        reminder_id: str,
        principal_kind: str,
        principal_id: str,
        *,
        title: str | None = None,
        due_date: datetime.date | None = None,
        clear_due_date: bool = False,
        is_done: bool | None = None,
    ) -> ReminderResponse | None:
        async with self._sessionmaker() as session:
            row = await session.scalar(
                select(Reminder).where(
                    Reminder.id == reminder_id,
                    Reminder.principal_kind == principal_kind,
                    Reminder.principal_id == principal_id,
                )
            )
            if row is None:
                return None
            if title is not None:
                row.title = title
            if clear_due_date:
                row.due_date = None
            elif due_date is not None:
                row.due_date = due_date
            if is_done is not None:
                row.is_done = is_done
            await session.commit()
            await session.refresh(row)
            return _to_response(row)

    async def delete(self, reminder_id: str, principal_kind: str, principal_id: str) -> bool:
        async with self._sessionmaker() as session:
            result = await session.execute(
                delete(Reminder).where(
                    Reminder.id == reminder_id,
                    Reminder.principal_kind == principal_kind,
                    Reminder.principal_id == principal_id,
                )
            )
            await session.commit()
            return bool(cast(CursorResult[Any], result).rowcount)

    async def delete_for_conversation(
        self, principal_kind: str, principal_id: str, conversation_id: str
    ) -> None:
        async with self._sessionmaker() as session:
            await session.execute(
                delete(Reminder).where(
                    Reminder.principal_kind == principal_kind,
                    Reminder.principal_id == principal_id,
                    Reminder.conversation_id == conversation_id,
                )
            )
            await session.commit()
