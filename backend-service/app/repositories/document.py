"""Data-access helpers for RAG documents and chunks."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.document import RagChunk, RagDocument


def list_documents(db: Session) -> List[RagDocument]:
    return list(db.scalars(select(RagDocument).order_by(RagDocument.id)))


def get_document(db: Session, doc_id: int) -> Optional[RagDocument]:
    return db.get(RagDocument, doc_id)


def get_by_filename(db: Session, filename: str) -> Optional[RagDocument]:
    return db.scalar(
        select(RagDocument).where(RagDocument.source_filename == filename)
    )


def create_document(
    db: Session, source_filename: str, source_path: str
) -> RagDocument:
    doc = RagDocument(source_filename=source_filename, source_path=source_path)
    db.add(doc)
    db.flush()
    return doc


def delete_chunks_for(db: Session, doc_id: int) -> int:
    """Remove all chunks for one document. Returns the number deleted."""
    result = db.execute(
        delete(RagChunk).where(RagChunk.document_id == doc_id)
    )
    return result.rowcount or 0


def get_chunks(db: Session, doc_id: int) -> List[RagChunk]:
    return list(
        db.scalars(
            select(RagChunk)
            .where(RagChunk.document_id == doc_id)
            .order_by(RagChunk.chunk_index)
        )
    )
