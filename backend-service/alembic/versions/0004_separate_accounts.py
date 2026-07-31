"""separate web (firebase) and whatsapp accounts

Web accounts authenticate with Google via Firebase and carry no phone;
WhatsApp accounts keep the phone key. Password auth is removed entirely.

Revision ID: 0004_separate_accounts
Revises: 0003_create_customer_orders
Create Date: 2026-06-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_separate_accounts"
down_revision: str | None = "0003_create_customer_orders"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("firebase_uid", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_firebase_uid"), "users", ["firebase_uid"], unique=True)
    op.alter_column("users", "phone", existing_type=sa.String(length=20), nullable=True)
    op.drop_column("users", "password_hash")
    op.drop_column("users", "is_phone_verified")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_phone_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.alter_column("users", "phone", existing_type=sa.String(length=20), nullable=False)
    op.drop_index(op.f("ix_users_firebase_uid"), table_name="users")
    op.drop_column("users", "email")
    op.drop_column("users", "firebase_uid")
