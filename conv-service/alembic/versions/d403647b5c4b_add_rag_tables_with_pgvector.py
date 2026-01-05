"""add_rag_tables_with_pgvector

Revision ID: d403647b5c4b
Revises: 62d1d540763c
Create Date: 2026-01-04 20:28:31.977842

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd403647b5c4b'
down_revision: Union[str, Sequence[str], None] = '62d1d540763c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pgvector extension (idempotent)
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Check if documents table exists before creating
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents')"
    ))
    documents_exists = result.scalar()
    
    if not documents_exists:
        # Create documents table
        op.create_table(
            'documents',
            sa.Column('id', sa.BigInteger(), nullable=False, autoincrement=True),
            sa.Column('source', sa.Text(), nullable=False, comment='e.g., "admin-bulk", "trusted-upload"'),
            sa.Column('source_id', sa.Text(), nullable=True, comment='Original message/upload ID'),
            sa.Column('blob_url', sa.Text(), nullable=True, comment='Azure blob URL'),
            sa.Column('content', sa.Text(), nullable=True, comment='Full extracted text (optional)'),
            sa.Column('metadata', sa.JSON(), nullable=True, comment='mime type, author, date, etc.'),
            sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Check if document_chunks table exists before creating
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks')"
    ))
    chunks_exists = result.scalar()
    
    if not chunks_exists:
        # Create document_chunks table with vector column (768 dimensions for Gemini)
        op.execute("""
            CREATE TABLE document_chunks (
                id BIGSERIAL PRIMARY KEY,
                document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                chunk_index INT NOT NULL,
                text TEXT NOT NULL,
                embedding vector(768) NOT NULL,
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL
            )
        """)
        
        # Create index for vector similarity search (IVFFlat)
        op.execute("""
            CREATE INDEX document_chunks_embedding_idx 
            ON document_chunks 
            USING ivfflat (embedding vector_l2_ops) 
            WITH (lists = 100)
        """)
        
        # Create index on document_id for faster joins
        op.create_index('idx_document_chunks_document_id', 'document_chunks', ['document_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_document_chunks_document_id', table_name='document_chunks')
    op.execute('DROP INDEX IF EXISTS document_chunks_embedding_idx')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.execute('DROP EXTENSION IF EXISTS vector')
