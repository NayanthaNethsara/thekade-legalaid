import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class OrderTracking(Base, TimestampMixin):
    """A Kakille order tracking record.

    This stores actual tracking numbers (e.g., VIMP...) and their statuses.
    """

    __tablename__ = "order_trackings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_identity: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    tracking_number: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="tracking")
