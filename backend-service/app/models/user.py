import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """A web (Google) or WhatsApp account; the two kinds are separate by design.

    WhatsApp accounts are keyed on the canonical phone number (digits only,
    e.g. `94702358060`) and are auto-created from inbound messages. Web accounts
    are keyed on the Firebase UID from Google sign-in and have no phone.
    `source` records which kind a row is.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    firebase_uid: Mapped[str | None] = mapped_column(
        String(128), unique=True, index=True, nullable=True
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(16), nullable=False)

    @property
    def identity(self) -> str:
        """Cross-feature customer key: the phone for WhatsApp accounts, the
        user id for web accounts (used by profiles, memory, and the agent)."""

        return self.phone or str(self.id)
