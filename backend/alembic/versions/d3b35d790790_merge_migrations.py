"""merge migrations

Revision ID: d3b35d790790
Revises: create_users_otp, e9f84e69927e
Create Date: 2025-10-11 11:58:06.530833

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3b35d790790'
down_revision: Union[str, Sequence[str], None] = ('create_users_otp', 'e9f84e69927e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
