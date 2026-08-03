from sqlalchemy import Boolean, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Source(Base, TimestampMixin):
    """A user-provided source (uploaded file, link, or pasted text).

    Extracted text lives in ``content``; original file bytes are never stored.
    ``conversation_id`` accepts the ``"global"`` sentinel for sources added
    outside a conversation.
    """

    __tablename__ = "sources"
    __table_args__ = (
        Index(
            "ix_sources_principal_conversation",
            "principal_kind",
            "principal_id",
            "conversation_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    principal_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    principal_id: Mapped[str] = mapped_column(String(128), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    size: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_selected: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    content: Mapped[str | None] = mapped_column(Text(), nullable=True)
