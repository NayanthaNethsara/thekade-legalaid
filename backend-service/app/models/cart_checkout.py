import uuid
from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class CustomerCartCheckout(Base, TimestampMixin):
    """A Kakille checkout cart generated for a customer.

    ``checkout_ref`` is the pre-payment checkout reference.
    ``expires_at`` is the 60-minute checkout link deadline.
    """

    __tablename__ = "customer_cart_checkouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_identity: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    cart: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
