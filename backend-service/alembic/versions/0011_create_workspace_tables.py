"""create sources, notes and reminders workspace tables

Revision ID: 0011_create_workspace_tables
Revises: 0010_create_pgvector_rag_tables
Create Date: 2026-08-03

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011_create_workspace_tables"
down_revision: str | None = "0010_create_pgvector_rag_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column[sa.types.DateTime]]:
    return [
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
    ]


def upgrade() -> None:
    op.create_table(
        "sources",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("principal_kind", sa.String(length=16), nullable=False),
        sa.Column("principal_id", sa.String(length=128), nullable=False),
        sa.Column("conversation_id", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("is_selected", sa.Boolean(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sources_principal_conversation",
        "sources",
        ["principal_kind", "principal_id", "conversation_id"],
    )

    op.create_table(
        "notes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("principal_kind", sa.String(length=16), nullable=False),
        sa.Column("principal_id", sa.String(length=128), nullable=False),
        sa.Column("conversation_id", sa.String(length=64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notes_principal_conversation",
        "notes",
        ["principal_kind", "principal_id", "conversation_id"],
    )

    op.create_table(
        "reminders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("principal_kind", sa.String(length=16), nullable=False),
        sa.Column("principal_id", sa.String(length=128), nullable=False),
        sa.Column("conversation_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("is_done", sa.Boolean(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_reminders_principal_conversation",
        "reminders",
        ["principal_kind", "principal_id", "conversation_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_reminders_principal_conversation", table_name="reminders")
    op.drop_table("reminders")
    op.drop_index("ix_notes_principal_conversation", table_name="notes")
    op.drop_table("notes")
    op.drop_index("ix_sources_principal_conversation", table_name="sources")
    op.drop_table("sources")
