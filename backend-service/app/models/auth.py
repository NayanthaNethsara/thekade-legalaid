"""Auth schema: users, account links, and OTP verification tokens.

These tables live in a dedicated ``auth`` schema, separate from the ``public``
RAG tables, so the ownership boundary is visible in the schema itself. Alembic
owns the whole schema; this is the Python port of what core-service used to
create in Go.
"""

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base

AUTH_SCHEMA = "auth"


class User(Base):
    """A platform user. ``id`` is an app-issued ``usr_<uuid hex>`` string."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('USER', 'ADMIN')", name="ck_users_role"),
        Index("ix_users_phone", "phone", postgresql_where=text("phone IS NOT NULL")),
        Index("ix_users_role", "role"),
        {"schema": AUTH_SCHEMA},
    )

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=True)
    phone = Column(Text, unique=True, nullable=True)
    role = Column(Text, nullable=False, server_default="USER")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    accounts = relationship(
        "Account",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Account(Base):
    """Links a user to an external auth provider (currently WhatsApp)."""

    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_accounts_provider_account"),
        Index("ix_accounts_user_id", "user_id"),
        Index("ix_accounts_provider", "provider"),
        {"schema": AUTH_SCHEMA},
    )

    id = Column(Text, primary_key=True, server_default=text("gen_random_uuid()::text"))
    user_id = Column(
        Text,
        ForeignKey(f"{AUTH_SCHEMA}.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider = Column(Text, nullable=False)
    provider_account_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="accounts")


class VerificationToken(Base):
    """A one-time login code. ``identifier`` is the phone; single-use on verify."""

    __tablename__ = "verification_tokens"
    __table_args__ = (
        PrimaryKeyConstraint("identifier", "token", name="pk_verification_tokens"),
        Index("ix_verification_tokens_expires", "expires"),
        {"schema": AUTH_SCHEMA},
    )

    identifier = Column(Text, nullable=False)
    token = Column(Text, nullable=False)
    expires = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
