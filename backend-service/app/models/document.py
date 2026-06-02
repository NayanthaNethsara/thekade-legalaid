from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.config import settings
from app.models.base import Base


class DocStatus:
    """Lifecycle of a source document in the RAG builder.

    pending  -> registered, PDF not yet parsed to Markdown
    parsed   -> Markdown generated / edited, awaiting human approval
    indexed  -> approved + embedded into the vector store
    error    -> parsing or indexing failed (see ``error`` column)
    """

    PENDING = "pending"
    PARSED = "parsed"
    INDEXED = "indexed"
    ERROR = "error"


class RagDocument(Base):
    """One source document (PDF) tracked through the human-in-the-loop flow."""

    __tablename__ = "rag_documents"

    id = Column(Integer, primary_key=True, index=True)
    source_filename = Column(String, unique=True, index=True, nullable=False)
    source_path = Column(String, nullable=False)
    markdown_path = Column(String, nullable=True)

    status = Column(String, nullable=False, default=DocStatus.PENDING,
                    server_default=DocStatus.PENDING)

    # Hash of the Markdown currently on disk.
    markdown_hash = Column(String, nullable=True)
    # Hash of the Markdown that produced the chunks currently in the store.
    # When it differs from ``markdown_hash`` the document is stale and needs
    # re-approval.
    indexed_hash = Column(String, nullable=True)

    chunk_count = Column(Integer, nullable=False, default=0, server_default="0")
    error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())
    parsed_at = Column(DateTime(timezone=True), nullable=True)
    indexed_at = Column(DateTime(timezone=True), nullable=True)

    chunks = relationship(
        "RagChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def is_stale(self) -> bool:
        """Indexed, but the Markdown changed since — re-approval needed."""
        return (
            self.status == DocStatus.INDEXED
            and self.indexed_hash is not None
            and self.markdown_hash != self.indexed_hash
        )


class RagChunk(Base):
    """A single embedded chunk belonging to one document."""

    __tablename__ = "rag_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("rag_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    heading = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    embedding = Column(Vector(settings.EMBED_DIM))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("RagDocument", back_populates="chunks")
