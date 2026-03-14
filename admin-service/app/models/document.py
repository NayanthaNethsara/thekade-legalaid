from sqlalchemy import BigInteger, Column, Integer, Text, JSON, TIMESTAMP
from sqlalchemy.sql import func

from app.core.db import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source = Column(Text, nullable=False)
    source_id = Column(Text, nullable=True)
    blob_url = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class DocumentChunk(Base):
    """Maps to the existing ``document_chunks`` table (created by migration 0001)."""
    __tablename__ = "document_chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(BigInteger, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    # embedding is a pgvector column — handled via raw SQL for inserts
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
