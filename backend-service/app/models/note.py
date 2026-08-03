from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Note(Base, TimestampMixin):
    """A workspace note scoped to a principal and conversation."""

    __tablename__ = "notes"
    __table_args__ = (
        Index(
            "ix_notes_principal_conversation",
            "principal_kind",
            "principal_id",
            "conversation_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    principal_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    principal_id: Mapped[str] = mapped_column(String(128), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text(), nullable=False)
