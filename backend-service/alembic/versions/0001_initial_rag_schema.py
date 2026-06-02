"""initial RAG schema (pgvector)

Revision ID: 0001_initial_rag_schema
Revises:
Create Date: 2026-05-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from alembic import op
from app.core.config import settings

revision: str = "0001_initial_rag_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "rag_documents",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("source_filename", sa.String, nullable=False),
        sa.Column("source_path", sa.String, nullable=False),
        sa.Column("markdown_path", sa.String, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="pending"),
        sa.Column("markdown_hash", sa.String, nullable=True),
        sa.Column("indexed_hash", sa.String, nullable=True),
        sa.Column("chunk_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_rag_documents_source_filename",
        "rag_documents",
        ["source_filename"],
        unique=True,
    )

    op.create_table(
        "rag_chunks",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "document_id",
            sa.Integer,
            sa.ForeignKey("rag_documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("heading", sa.Text, nullable=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("token_count", sa.Integer, nullable=True),
        sa.Column("embedding", Vector(settings.EMBED_DIM)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index("ix_rag_chunks_document_id", "rag_chunks", ["document_id"])
    op.execute(
        "CREATE INDEX ix_rag_chunks_embedding ON rag_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.drop_index("ix_rag_chunks_embedding", table_name="rag_chunks")
    op.drop_index("ix_rag_chunks_document_id", table_name="rag_chunks")
    op.drop_table("rag_chunks")
    op.drop_index("ix_rag_documents_source_filename", table_name="rag_documents")
    op.drop_table("rag_documents")
