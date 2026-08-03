import datetime

from sqlalchemy import Boolean, Date, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Reminder(Base, TimestampMixin):
    """A workspace reminder scoped to a principal and conversation."""

    __tablename__ = "reminders"
    __table_args__ = (
        Index(
            "ix_reminders_principal_conversation",
            "principal_kind",
            "principal_id",
            "conversation_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    principal_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    principal_id: Mapped[str] = mapped_column(String(128), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(Text(), nullable=False)
    due_date: Mapped[datetime.date | None] = mapped_column(Date(), nullable=True)
    is_done: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
