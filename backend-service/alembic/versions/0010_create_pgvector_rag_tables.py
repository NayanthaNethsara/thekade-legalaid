"""create pgvector RAG tables for knowledge documents and vector chunks

Revision ID: 0010_create_pgvector_rag_tables
Revises: 0009_create_conversation_index
Create Date: 2026-08-01

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_create_pgvector_rag_tables"
down_revision: str | None = "0009_create_conversation_index"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create knowledge_documents table
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("chunk_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 3. Create knowledge_chunks table with 768-dim vector column
    op.execute("""
        CREATE TABLE knowledge_chunks (
            id VARCHAR(64) PRIMARY KEY,
            document_id VARCHAR(64) NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            content TEXT NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            embedding vector(768)
        );
    """)

    # 4. Create HNSW index for sub-millisecond cosine similarity search
    op.execute("""
        CREATE INDEX idx_knowledge_chunks_embedding 
        ON knowledge_chunks 
        USING hnsw (embedding vector_cosine_ops);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding;")
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_documents")
