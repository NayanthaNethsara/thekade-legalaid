"""add last_order to customer_profiles table

Revision ID: 0005_add_last_order_to_profiles
Revises: 0004_separate_accounts
Create Date: 2026-06-23

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "0005_add_last_order_to_profiles"
down_revision: str | None = "0004_separate_accounts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("customer_profiles", sa.Column("last_order", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("customer_profiles", "last_order")
