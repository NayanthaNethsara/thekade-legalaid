"""create customer_orders table

Revision ID: 0003_create_customer_orders
Revises: 0002_create_customer_profiles
Create Date: 2026-06-09

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "0003_create_customer_orders"
down_revision: str | None = "0002_create_customer_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customer_orders",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_identity", sa.String(length=64), nullable=False),
        sa.Column("order_ref", sa.String(length=64), nullable=True),
        sa.Column("order_number", sa.String(length=64), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="awaiting_payment"
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customer_orders_user_identity", "customer_orders", ["user_identity"])
    op.create_index("ix_customer_orders_order_ref", "customer_orders", ["order_ref"])
    op.create_index("ix_customer_orders_order_number", "customer_orders", ["order_number"])


def downgrade() -> None:
    op.drop_index("ix_customer_orders_order_number", table_name="customer_orders")
    op.drop_index("ix_customer_orders_order_ref", table_name="customer_orders")
    op.drop_index("ix_customer_orders_user_identity", table_name="customer_orders")
    op.drop_table("customer_orders")
