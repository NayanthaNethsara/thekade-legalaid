"""auth schema (users, accounts, verification_tokens)

Revision ID: 0002_auth_schema
Revises: 0001_initial_rag_schema
Create Date: 2026-06-03

Port of the Go core-service auth migration. Lives in a dedicated ``auth`` schema,
separate from the ``public`` RAG tables. Backend-service (Alembic) is now the
sole owner of these tables.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0002_auth_schema"
down_revision: Union[str, None] = "0001_initial_rag_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS auth")

    op.create_table(
        "users",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("name", sa.Text, nullable=True),
        sa.Column("phone", sa.Text, nullable=True),
        sa.Column("role", sa.Text, nullable=False, server_default="USER"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.CheckConstraint("role IN ('USER', 'ADMIN')", name="ck_users_role"),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
        schema="auth",
    )
    op.create_index(
        "ix_users_phone", "users", ["phone"], schema="auth",
        postgresql_where=sa.text("phone IS NOT NULL"),
    )
    op.create_index("ix_users_role", "users", ["role"], schema="auth")

    op.create_table(
        "accounts",
        sa.Column("id", sa.Text, primary_key=True,
                  server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("provider", sa.Text, nullable=False),
        sa.Column("provider_account_id", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["user_id"], ["auth.users.id"], ondelete="CASCADE",
            name="fk_accounts_user_id",
        ),
        sa.UniqueConstraint("provider", "provider_account_id",
                            name="uq_accounts_provider_account"),
        schema="auth",
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"], schema="auth")
    op.create_index("ix_accounts_provider", "accounts", ["provider"], schema="auth")

    op.create_table(
        "verification_tokens",
        sa.Column("identifier", sa.Text, nullable=False),
        sa.Column("token", sa.Text, nullable=False),
        sa.Column("expires", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("identifier", "token",
                                name="pk_verification_tokens"),
        schema="auth",
    )
    op.create_index("ix_verification_tokens_expires", "verification_tokens",
                    ["expires"], schema="auth")


def downgrade() -> None:
    op.drop_index("ix_verification_tokens_expires", table_name="verification_tokens",
                  schema="auth")
    op.drop_table("verification_tokens", schema="auth")
    op.drop_index("ix_accounts_provider", table_name="accounts", schema="auth")
    op.drop_index("ix_accounts_user_id", table_name="accounts", schema="auth")
    op.drop_table("accounts", schema="auth")
    op.drop_index("ix_users_role", table_name="users", schema="auth")
    op.drop_index("ix_users_phone", table_name="users", schema="auth")
    op.drop_table("users", schema="auth")
    op.execute("DROP SCHEMA IF EXISTS auth")
