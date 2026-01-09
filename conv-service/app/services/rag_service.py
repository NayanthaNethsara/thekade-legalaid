"""
RAG (Retrieval-Augmented Generation) service for answering questions.
"""
import logging
from typing import Dict, Any, Optional, List
from app.storage.pgvector import PgVectorStore
from app.services.embeddings import EmbeddingClient
from app.services.llm import LLMClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG-based question answering."""
    
    def __init__(
        self,
        vector_store: Optional[PgVectorStore] = None,
        embedder: Optional[EmbeddingClient] = None,
        llm: Optional[LLMClient] = None
    ):
        """
        Initialize the RAG service.
        
        Args:
            vector_store: Vector store instance (creates new if not provided)
            embedder: Embedding client instance (creates new if not provided)
            llm: LLM client instance (creates new if not provided)
        """
        self.vector_store = vector_store or PgVectorStore()
        self.embedder = embedder or EmbeddingClient()
        self.llm = llm or LLMClient()
        logger.info("RAGService initialized")
    
    def query(
        self,
        question: str,
        top_k: Optional[int] = None,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG.
        
        Args:
            question: User's question
            top_k: Number of document chunks to retrieve (uses settings.RAG_TOP_K if not provided)
            chat_history: Optional chat history for context
            
        Returns:
            Dict with 'answer', 'citations', and 'metadata'
        """
        top_k = top_k or settings.RAG_TOP_K
        
        logger.info(f"RAG query: {question[:100]}... (top_k={top_k})")
        
        try:
            # 1. Generate query embedding
            query_embedding = self.embedder.embed_text(question)
            logger.info(f"Generated query embedding (dim={len(query_embedding)})")
            
            # 2. Retrieve similar chunks from vector store
            similar_chunks = self.vector_store.query_similar_chunks(
                query_embedding=query_embedding,
                top_k=top_k
            )
            
            if not similar_chunks:
                logger.warning("No similar chunks found")
                return {
                    "answer": "I don't have any relevant information in my database to answer this question.",
                    "citations": [],
                    "metadata": {
                        "chunks_retrieved": 0,
                        "top_k": top_k
                    }
                }
            
            # 3. Generate answer using LLM
            result = self.llm.generate_answer(
                question=question,
                context_chunks=similar_chunks
            )
            
            # 4. Add metadata
            result["metadata"] = {
                "chunks_retrieved": len(similar_chunks),
                "top_k": top_k,
                "avg_distance": sum(chunk['distance'] for chunk in similar_chunks) / len(similar_chunks),
                "documents_referenced": len(set(chunk['document_id'] for chunk in similar_chunks))
            }
            
            logger.info(f"RAG query complete: {len(result['answer'])} chars, {len(result['citations'])} citations")
            
            return result
            
        except Exception as e:
            logger.error(f"RAG query failed: {e}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics."""
        return {
            "total_documents": self.vector_store.get_document_count(),
            "total_chunks": self.vector_store.get_chunk_count(),
            "embedding_model": self.embedder.model,
            "vector_dim": settings.VECTOR_DIM,
            "default_top_k": settings.RAG_TOP_K
        }
