from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ConversationIndex(Base, TimestampMixin):
    __tablename__ = "conversation_index"
    __table_args__ = (
        Index(
            "ix_conversation_index_principal_recent",
            "principal_kind",
            "principal_id",
            "updated_at",
        ),
    )

    thread_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    principal_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    principal_id: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str | None] = mapped_column(Text(), nullable=True)
