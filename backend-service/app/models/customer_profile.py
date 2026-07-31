from typing import Any

from sqlalchemy import String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class CustomerProfile(Base, TimestampMixin):
    """Relational contact data, editable from the web UI or filled by the LLM.

    Fields are nullable so the LLM can fill gaps without ever overwriting a
    value the customer set directly.
    """

    __tablename__ = "customer_profiles"

    user_identity: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # [{label, value, is_default}]
    addresses: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
