"""add cart column to customer_orders table

Revision ID: 0007_add_cart_to_customer_orders
Revises: 0006_change_memory_to_jsonb
Create Date: 2026-06-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "0007_add_cart_to_customer_orders"
down_revision: str | None = "0006_change_memory_to_jsonb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "customer_orders",
        sa.Column("cart", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("customer_orders", "cart")
