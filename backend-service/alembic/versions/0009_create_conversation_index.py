"""create conversation_index table for the sidebar list

Revision ID: 0009_create_conversation_index
Revises: 6c455115cd4d
Create Date: 2026-07-01

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009_create_conversation_index"
down_revision: str | None = "6c455115cd4d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "conversation_index",
        sa.Column("thread_id", sa.String(length=128), nullable=False),
        sa.Column("principal_kind", sa.String(length=16), nullable=False),
        sa.Column("principal_id", sa.String(length=128), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("thread_id"),
    )
    op.create_index(
        "ix_conversation_index_principal_recent",
        "conversation_index",
        ["principal_kind", "principal_id", "updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_conversation_index_principal_recent", table_name="conversation_index")
    op.drop_table("conversation_index")
