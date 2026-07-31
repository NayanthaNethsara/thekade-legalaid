"""separate cart checkout and tracking

Revision ID: 0008_separate_cart_checkout_and_tracking
Revises: 0007_add_cart_to_customer_orders
Create Date: 2026-06-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "0008_sep_cart_tracking"
down_revision: str | None = "0007_add_cart_to_customer_orders"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Rename table
    op.rename_table("customer_orders", "customer_cart_checkouts")

    # Rename column
    op.alter_column("customer_cart_checkouts", "order_ref", new_column_name="checkout_ref")

    # Drop order_number column
    op.drop_column("customer_cart_checkouts", "order_number")

    # Rename indexes safely
    op.execute("DROP INDEX IF EXISTS ix_customer_orders_order_ref")
    op.create_index(
        "ix_customer_cart_checkouts_checkout_ref", "customer_cart_checkouts", ["checkout_ref"]
    )

    op.execute("DROP INDEX IF EXISTS ix_customer_orders_user_identity")
    op.create_index(
        "ix_customer_cart_checkouts_user_identity", "customer_cart_checkouts", ["user_identity"]
    )

    op.execute("DROP INDEX IF EXISTS ix_customer_orders_order_number")

    # Create order_trackings table
    op.create_table(
        "order_trackings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_identity", sa.String(length=64), nullable=False),
        sa.Column("tracking_number", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_order_trackings_user_identity", "order_trackings", ["user_identity"])
    op.create_index("ix_order_trackings_tracking_number", "order_trackings", ["tracking_number"])


def downgrade() -> None:
    op.drop_table("order_trackings")

    op.add_column(
        "customer_cart_checkouts", sa.Column("order_number", sa.String(length=64), nullable=True)
    )
    op.alter_column("customer_cart_checkouts", "checkout_ref", new_column_name="order_ref")

    op.execute("DROP INDEX IF EXISTS ix_customer_cart_checkouts_user_identity")
    op.execute("DROP INDEX IF EXISTS ix_customer_cart_checkouts_checkout_ref")

    op.create_index(
        "ix_customer_orders_user_identity", "customer_cart_checkouts", ["user_identity"]
    )
    op.create_index("ix_customer_orders_order_ref", "customer_cart_checkouts", ["order_ref"])
    op.create_index("ix_customer_orders_order_number", "customer_cart_checkouts", ["order_number"])

    op.rename_table("customer_cart_checkouts", "customer_orders")
