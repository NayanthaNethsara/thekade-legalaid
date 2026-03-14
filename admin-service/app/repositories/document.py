"""Repository for Document and DocumentChunk access.

Wraps raw pgvector inserts and standard SQLAlchemy queries so that
services don't have to deal directly with the DB session logic.
"""

import json
from typing import Optional
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from app.models.document import Document


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_source_id(self, source_id: str) -> Optional[Document]:
        """Check if a document exists by its hash/source_id."""
        return self.db.query(Document).filter(Document.source_id == source_id).first()

    def get_by_id(self, document_id: int) -> Optional[Document]:
        """Fetch a document by primary key."""
        return self.db.query(Document).filter(Document.id == document_id).first()

    def create_document(
        self,
        source: str,
        source_id: str,
        content: str,
        metadata: dict,
    ) -> Document:
        """Create a document and return it so chunks can be added in batches."""
        doc = Document(
            source=source,
            source_id=source_id,
            content=content,
            metadata_=metadata,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def add_chunks_to_document(
        self,
        doc_id: int,
        filename: str,
        chunks: list,
        embeddings: list[list[float]],
    ) -> None:
        """Insert a batch of chunks and commit."""
        for chunk, embedding in zip(chunks, embeddings):
            embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
            
            self.db.execute(
                sql_text("""
                    INSERT INTO document_chunks
                        (document_id, chunk_index, text, embedding, metadata)
                    VALUES
                        (:doc_id, :idx, :text, CAST(:embedding AS vector), :meta)
                """),
                {
                    "doc_id": doc_id,
                    "idx": chunk.index,
                    "text": chunk.text,
                    "embedding": embedding_str,
                    "meta": json.dumps({
                        "source_file": filename,
                        "chunk_size": len(chunk.text),
                    }),
                },
            )

        self.db.commit()

    def get_paginated(self, limit: int = 10, offset: int = 0) -> list[Document]:
        """Get documents with limit and offset."""
        return self.db.query(Document).order_by(Document.created_at.desc()).offset(offset).limit(limit).all()

    def count_documents(self) -> int:
        """Count total documents."""
        return self.db.execute(sql_text("SELECT COUNT(*) FROM documents")).scalar() or 0

    def count_chunks(self) -> int:
        """Count total document chunks."""
        return self.db.execute(sql_text("SELECT COUNT(*) FROM document_chunks")).scalar() or 0

    def get_last_ingested_time(self):
        """Get the creation time of the youngest document."""
        return self.db.execute(sql_text("SELECT MAX(created_at) FROM documents")).scalar()

    def get_chunks_for_document(self, document_id: int) -> list[dict]:
        """Get the chunks (without embedding vector) for a document."""
        rows = self.db.execute(
            sql_text("""
                SELECT id, chunk_index, text, metadata, created_at
                FROM document_chunks
                WHERE document_id = :doc_id
                ORDER BY chunk_index ASC
            """),
            {"doc_id": document_id}
        ).fetchall()

        return [
            {
                "id": row.id,
                "index": row.chunk_index,
                "text": row.text,
                "metadata": row.metadata,
                "created_at": row.created_at,
            }
            for row in rows
        ]
