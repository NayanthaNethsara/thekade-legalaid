"""add user status column

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-14 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('status', sa.String(), nullable=False, server_default='guest'),
    )


def downgrade() -> None:
    op.drop_column('users', 'status')
