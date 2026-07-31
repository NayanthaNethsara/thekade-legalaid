"""change memory column in customer_memories table to JSONB

Revision ID: 0006_change_memory_to_jsonb
Revises: 0005_add_last_order_to_profiles
Create Date: 2026-06-23

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "0006_change_memory_to_jsonb"
down_revision: str | None = "0005_add_last_order_to_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop existing default constraint first to avoid casting mismatch
    op.alter_column("customer_memories", "memory", server_default=None)
    op.alter_column(
        "customer_memories",
        "memory",
        type_=JSONB(),
        postgresql_using="'{}'::jsonb",
        server_default=sa.text("'{}'::jsonb"),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column("customer_memories", "memory", server_default=None)
    op.alter_column(
        "customer_memories",
        "memory",
        type_=sa.Text(),
        postgresql_using="memory::text",
        server_default="",
        nullable=False,
    )
