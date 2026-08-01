import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.rag import KnowledgeChunk, KnowledgeDocument
from app.schemas.rag import DocumentResponse, RetrievalChunk


class RAGRepository:
    """Repository handling database persistence and vector queries for RAG knowledge base."""

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def upsert_document(
        self, doc_id: str, title: str, category: str, file_path: str | None, chunk_count: int
    ) -> DocumentResponse:
        """Insert or update parent document metadata record."""
        async with self._sessionmaker() as session:
            stmt = insert(KnowledgeDocument).values(
                id=doc_id,
                title=title,
                category=category,
                file_path=file_path,
                chunk_count=chunk_count,
                status="indexed",
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "title": stmt.excluded.title,
                    "category": stmt.excluded.category,
                    "file_path": stmt.excluded.file_path,
                    "chunk_count": stmt.excluded.chunk_count,
                    "status": "indexed",
                    "updated_at": func.now(),
                },
            )
            await session.execute(stmt)
            await session.commit()

            result = await session.execute(
                select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
            )
            doc = result.scalar_one_or_none()

            if doc:
                return DocumentResponse.model_validate(doc)

            return DocumentResponse(
                id=doc_id,
                title=title,
                category=category,
                file_path=file_path,
                status="indexed",
                chunk_count=chunk_count,
                created_at=datetime.now(timezone.utc),
            )

    async def save_chunks(
        self, doc_id: str, chunks_data: list[tuple[str, list[float]]]
    ) -> None:
        """Persist text chunks and their corresponding embedding vectors."""
        async with self._sessionmaker() as session:
            # Delete existing chunks for document re-indexing
            await session.execute(
                text("DELETE FROM knowledge_chunks WHERE document_id = :doc_id"),
                {"doc_id": doc_id},
            )

            for idx, (content, vector) in enumerate(chunks_data):
                chunk_id = f"chk-{uuid.uuid4().hex[:8]}"
                await session.execute(
                    text("""
                        INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding, created_at, updated_at)
                        VALUES (:id, :doc_id, :idx, :content, :embedding::vector, NOW(), NOW())
                    """),
                    {
                        "id": chunk_id,
                        "doc_id": doc_id,
                        "idx": idx,
                        "content": content,
                        "embedding": str(vector),
                    },
                )
            await session.commit()

    async def list_documents(self) -> list[DocumentResponse]:
        """Fetch all indexed documents from the knowledge base."""
        async with self._sessionmaker() as session:
            result = await session.execute(
                select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc())
            )
            docs = result.scalars().all()
            return [DocumentResponse.model_validate(doc) for doc in docs]

    async def get_document(self, doc_id: str) -> DocumentResponse | None:
        """Fetch a single document by ID."""
        async with self._sessionmaker() as session:
            result = await session.execute(
                select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            return DocumentResponse.model_validate(doc) if doc else None

    async def search_similar_chunks(
        self,
        query_vector: list[float],
        top_k: int = 3,
        similarity_threshold: float = 0.65,
        category_filter: str | None = None,
    ) -> list[RetrievalChunk]:
        """Perform vector cosine similarity search via pgvector operator (<=>)."""
        async with self._sessionmaker() as session:
            category_where = "AND d.category = :category" if category_filter else ""
            query_sql = text(f"""
                SELECT 
                    c.id AS chunk_id,
                    d.id AS document_id,
                    d.title AS document_title,
                    d.category AS category,
                    c.content AS content,
                    1 - (c.embedding <=> :query_vector::vector) AS similarity_score
                FROM knowledge_chunks c
                JOIN knowledge_documents d ON c.document_id = d.id
                WHERE 1 - (c.embedding <=> :query_vector::vector) >= :similarity_threshold
                {category_where}
                ORDER BY c.embedding <=> :query_vector::vector ASC
                LIMIT :top_k
            """)

            params: dict[str, Any] = {
                "query_vector": str(query_vector),
                "similarity_threshold": similarity_threshold,
                "top_k": top_k,
            }
            if category_filter:
                params["category"] = category_filter

            result = await session.execute(query_sql, params)
            rows = result.fetchall()

            return [
                RetrievalChunk(
                    chunk_id=r.chunk_id,
                    document_id=r.document_id,
                    document_title=r.document_title,
                    category=r.category,
                    content=r.content,
                    similarity_score=float(r.similarity_score),
                )
                for r in rows
            ]

    async def get_stats(self) -> dict[str, int]:
        """Count total documents and vector chunks."""
        async with self._sessionmaker() as session:
            doc_count = await session.scalar(select(func.count(KnowledgeDocument.id))) or 0
            chunk_count = await session.scalar(select(func.count(KnowledgeChunk.id))) or 0
            return {"documents": doc_count, "chunks": chunk_count}
