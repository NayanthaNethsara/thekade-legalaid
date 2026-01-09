"""
Indexer service for consuming Kafka indexing events and storing document embeddings.
This service implements Phase 3 of the RAG architecture.
"""
import logging
import asyncio
from typing import Dict, Any, Optional
from app.storage.pgvector import PgVectorStore
from app.services.embeddings import EmbeddingClient
from app.utils.text_extraction import extract_text, normalize_text
from app.utils.chunking import TextChunker
from app.utils.azure_storage import download_blob_to_bytes
from app.core.config import settings

logger = logging.getLogger(__name__)


class IndexerService:
    """Service for indexing documents from Kafka events."""
    
    def __init__(
        self,
        vector_store: Optional[PgVectorStore] = None,
        embedder: Optional[EmbeddingClient] = None,
        chunker: Optional[TextChunker] = None
    ):
        """
        Initialize the indexer service.
        
        Args:
            vector_store: Vector store instance (creates new if not provided)
            embedder: Embedding client instance (creates new if not provided)
            chunker: Text chunker instance (creates new if not provided)
        """
        self.vector_store = vector_store or PgVectorStore()
        self.embedder = embedder or EmbeddingClient()
        self.chunker = chunker or TextChunker(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        logger.info("IndexerService initialized")
    
    async def process_indexing_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an indexing event from Kafka.
        
        Expected event format:
        {
            "blob_url": "https://...",
            "source": "admin-bulk" | "trusted-upload",
            "source_id": "optional_id",
            "metadata": {
                "filename": "document.pdf",
                "mime_type": "application/pdf",
                "uploaded_by": "admin",
                ...
            }
        }
        
        Args:
            event: Indexing event dictionary
            
        Returns:
            Dict with indexing results
        """
        blob_url = event.get("blob_url")
        source = event.get("source", "unknown")
        source_id = event.get("source_id")
        metadata = event.get("metadata", {})
        
        logger.info(f"Processing indexing event: source={source}, blob_url={blob_url}")
        
        try:
            # 1. Download blob from Azure
            file_bytes = await self._download_blob(blob_url)
            if not file_bytes:
                logger.error(f"Failed to download blob: {blob_url}")
                return {"status": "error", "message": "Failed to download blob"}
            
            # 2. Extract text from file
            filename = metadata.get("filename", "unknown")
            mime_type = metadata.get("mime_type", "")
            
            text = await self._extract_text_from_bytes(file_bytes, filename, mime_type)
            if not text:
                logger.error(f"Failed to extract text from: {filename}")
                return {"status": "error", "message": "Failed to extract text"}
            
            # Normalize text
            text = normalize_text(text)
            
            # 3. Store document record
            doc_id = self.vector_store.upsert_document(
                source=source,
                content=text,
                metadata=metadata,
                source_id=source_id,
                blob_url=blob_url
            )
            
            # 4. Chunk text
            chunks = self.chunker.chunk_text(text)
            logger.info(f"Document {doc_id} chunked into {len(chunks)} chunks")
            
            # 5. Generate embeddings in batches
            chunk_texts = [chunk['text'] for chunk in chunks]
            embeddings = self.embedder.embed_texts(chunk_texts)
            
            # 6. Prepare chunks with embeddings
            chunks_with_embeddings = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_data = {
                    'text': chunk['text'],
                    'embedding': embedding,
                    'metadata': {
                        'chunk_index': i,
                        'start_char': chunk.get('start_char', 0),
                        'end_char': chunk.get('end_char', len(chunk['text'])),
                        'document_metadata': metadata
                    }
                }
                chunks_with_embeddings.append(chunk_data)
            
            # 7. Store chunks with embeddings
            self.vector_store.upsert_chunks(doc_id, chunks_with_embeddings)
            
            logger.info(
                f"Successfully indexed document {doc_id}: "
                f"{len(chunks_with_embeddings)} chunks, "
                f"source={source}"
            )
            
            return {
                "status": "success",
                "document_id": doc_id,
                "chunks_created": len(chunks_with_embeddings),
                "source": source,
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Error processing indexing event: {e}", exc_info=True)
            return {
                "status": "error",
                "message": str(e),
                "source": source,
                "blob_url": blob_url
            }
    
    async def _download_blob(self, blob_url: str) -> Optional[bytes]:
        """
        Download blob from Azure Blob Storage.
        
        Args:
            blob_url: Full URL to the blob
            
        Returns:
            Blob content as bytes, or None if failed
        """
        try:
            # Run sync download in executor to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                download_blob_to_bytes,
                blob_url
            )
        except Exception as e:
            logger.error(f"Failed to download blob {blob_url}: {e}")
            return None
    
    async def _extract_text_from_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str
    ) -> Optional[str]:
        """
        Extract text from file bytes.
        
        Args:
            file_bytes: File content as bytes
            filename: Original filename (used to determine file type)
            mime_type: MIME type of the file
            
        Returns:
            Extracted text, or None if failed
        """
        try:
            # Run sync extraction in executor to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                extract_text,
                file_bytes,
                filename
            )
        except Exception as e:
            logger.error(f"Failed to extract text from {filename}: {e}")
            return None
    
    def process_indexing_event_sync(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronous wrapper for process_indexing_event.
        Useful for non-async contexts.
        
        Args:
            event: Indexing event dictionary
            
        Returns:
            Dict with indexing results
        """
        return asyncio.run(self.process_indexing_event(event))
