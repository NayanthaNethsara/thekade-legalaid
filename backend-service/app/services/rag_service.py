import uuid
from typing import Any
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings
from app.core.logging import get_logger
from app.repositories.rag_repository import RAGRepository
from app.schemas.rag import DocumentResponse, RAGSystemStatus, RetrievalChunk

logger = get_logger(__name__)

EMBEDDING_MODEL_NAME = "models/text-embedding-004"


def get_vertex_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    """Initialize Vertex AI embeddings model using GCP Application Default Credentials."""
    settings = get_settings()
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL_NAME,
        vertexai=True,
        project=settings.llm.project or None,
        location=settings.llm.location or "global",
    )


class RAGService:
    """High-level domain service encapsulating document ingestion, text chunking,
    Vertex AI embeddings generation, and vector retrieval.
    """

    def __init__(
        self,
        repository: RAGRepository,
        embeddings_model: GoogleGenerativeAIEmbeddings | None = None,
    ) -> None:
        self._repository = repository
        self._embeddings = embeddings_model or get_vertex_embeddings_model()

    async def ingest_document(
        self,
        title: str,
        category: str,
        raw_text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        file_path: str | None = None,
    ) -> DocumentResponse:
        """Process document into chunks, generate Vertex AI vectors, and persist via repository."""
        doc_id = f"doc-{uuid.uuid4().hex[:8]}"

        chunks = self._chunk_text(raw_text, chunk_size, chunk_overlap)
        logger.info(
            "rag.service.ingest_start",
            doc_id=doc_id,
            title=title,
            category=category,
            chunk_count=len(chunks),
        )

        # Generate embeddings using Vertex AI text-embedding-004
        vectors = await self._embeddings.aembed_documents(chunks)
        chunks_data = list(zip(chunks, vectors, strict=False))

        # Save via repository
        doc_resp = await self._repository.upsert_document(
            doc_id=doc_id,
            title=title,
            category=category,
            file_path=file_path,
            chunk_count=len(chunks),
        )
        await self._repository.save_chunks(doc_id, chunks_data)

        logger.info("rag.service.ingest_completed", doc_id=doc_id)
        return doc_resp

    async def retrieve_relevant_chunks(
        self,
        query: str,
        top_k: int = 3,
        similarity_threshold: float = 0.65,
        category_filter: str | None = None,
    ) -> list[RetrievalChunk]:
        """Generate query vector with Vertex AI and retrieve nearest chunks from repository."""
        query_vector = await self._embeddings.aembed_query(query)
        return await self._repository.search_similar_chunks(
            query_vector=query_vector,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            category_filter=category_filter,
        )

    async def get_system_status(self) -> RAGSystemStatus:
        """Get vector store and embedding metrics."""
        stats = await self._repository.get_stats()
        return RAGSystemStatus(
            vector_store="PostgreSQL pgvector (HNSW Index)",
            embedding_provider="Google Vertex AI",
            embedding_model=EMBEDDING_MODEL_NAME,
            total_documents=stats.get("documents", 0),
            total_chunks=stats.get("chunks", 0),
            health="healthy",
        )

    def _chunk_text(self, text: str, size: int, overlap: int) -> list[str]:
        """Split text recursively with overlap."""
        words = text.split()
        if not words:
            return []

        chunks = []
        start = 0
        while start < len(words):
            end = start + size
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            if end >= len(words):
                break
            start += max(1, size - overlap)

        return chunks
