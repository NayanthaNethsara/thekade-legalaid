from typing import Any

from sqlalchemy import String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class CustomerMemory(Base, TimestampMixin):
    """LLM-managed behavioural preferences, merged each turn by write_memory."""

    __tablename__ = "customer_memories"

    user_identity: Mapped[str] = mapped_column(String(64), primary_key=True)
    memory: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
