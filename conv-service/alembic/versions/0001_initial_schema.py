"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-03-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------------- pgvector
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # ------------------------------------------------------------------ users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('phone_number', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_phone_number', 'users', ['phone_number'], unique=True)

    # --------------------------------------------------------------- documents
    op.create_table(
        'documents',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('source', sa.Text(), nullable=False, comment='e.g. admin-bulk, trusted-upload'),
        sa.Column('source_id', sa.Text(), nullable=True, comment='Original message/upload ID'),
        sa.Column('blob_url', sa.Text(), nullable=True, comment='Azure blob URL'),
        sa.Column('content', sa.Text(), nullable=True, comment='Full extracted text'),
        sa.Column('metadata', sa.JSON(), nullable=True, comment='mime type, author, date, etc.'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # ---------------------------------------------------------- document_chunks
    op.execute("""
        CREATE TABLE document_chunks (
            id          BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            text        TEXT NOT NULL,
            embedding   vector(768) NOT NULL,
            metadata    JSONB,
            created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
        )
    """)
    op.create_index('idx_document_chunks_document_id', 'document_chunks', ['document_id'])
    op.execute("""
        CREATE INDEX document_chunks_embedding_idx
        ON document_chunks
        USING ivfflat (embedding vector_l2_ops)
        WITH (lists = 100)
    """)


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS document_chunks_embedding_idx')
    op.drop_index('idx_document_chunks_document_id', table_name='document_chunks')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.drop_index('ix_users_phone_number', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')
    op.execute('DROP EXTENSION IF EXISTS vector')
