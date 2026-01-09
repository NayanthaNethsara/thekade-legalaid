"""
Vector storage layer using PostgreSQL + pgvector.
"""
import logging
from typing import List, Dict, Any, Optional
import json
import psycopg
from psycopg.rows import dict_row
from app.core.config import settings

logger = logging.getLogger(__name__)


class PgVectorStore:
    """PostgreSQL + pgvector storage for documents and embeddings."""
    
    def __init__(self, connection_string: Optional[str] = None):
        """
        Initialize the vector store.
        
        Args:
            connection_string: Database connection string (uses settings.DIRECT_URL if not provided)
        """
        self.connection_string = connection_string or settings.DIRECT_URL
        logger.info("PgVectorStore initialized")
    
    def get_connection(self):
        """Get a database connection."""
        return psycopg.connect(self.connection_string, row_factory=dict_row)
    
    def upsert_document(
        self,
        source: str,
        content: str,
        metadata: Dict[str, Any],
        source_id: Optional[str] = None,
        blob_url: Optional[str] = None
    ) -> int:
        """
        Insert or update a document.
        
        Args:
            source: Source of the document (e.g., "admin-bulk", "trusted-upload")
            content: Full document text
            metadata: Document metadata (filename, mime type, etc.)
            source_id: Optional source identifier
            blob_url: Optional Azure Blob URL
            
        Returns:
            Document ID
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO documents (source, source_id, blob_url, content, metadata)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (source, source_id, blob_url, content, json.dumps(metadata))
                )
                result = cur.fetchone()
                doc_id = result['id']
                conn.commit()
                logger.info(f"Upserted document {doc_id} from source '{source}'")
                return doc_id
    
    def upsert_chunks(
        self,
        document_id: int,
        chunks: List[Dict[str, Any]]
    ) -> int:
        """
        Insert document chunks with embeddings.
        
        Args:
            document_id: Parent document ID
            chunks: List of chunk dicts with 'text', 'embedding', and 'metadata'
            
        Returns:
            Number of chunks inserted
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for chunk in chunks:
                    cur.execute(
                        """
                        INSERT INTO document_chunks 
                        (document_id, chunk_index, text, embedding, metadata)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (
                            document_id,
                            chunk['metadata']['chunk_index'],
                            chunk['text'],
                            chunk['embedding'],
                            json.dumps(chunk['metadata'])
                        )
                    )
                conn.commit()
                logger.info(f"Inserted {len(chunks)} chunks for document {document_id}")
                return len(chunks)
    
    def query_similar_chunks(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query for similar chunks using vector similarity search.
        
        Args:
            query_embedding: Query vector embedding
            top_k: Number of results to return
            filter_metadata: Optional metadata filters (not yet implemented)
            
        Returns:
            List of similar chunks with metadata and distance scores
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Convert embedding to pgvector format
                embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
                
                cur.execute(
                    """
                    SELECT 
                        dc.id,
                        dc.document_id,
                        dc.chunk_index,
                        dc.text,
                        dc.metadata,
                        d.metadata as document_metadata,
                        dc.embedding <=> %s::vector AS distance
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    ORDER BY dc.embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (embedding_str, embedding_str, top_k)
                )
                
                results = cur.fetchall()
                logger.info(f"Retrieved {len(results)} similar chunks (top_k={top_k})")
                return results
    
    def delete_document(self, document_id: int) -> bool:
        """
        Delete a document and all its chunks (cascades).
        
        Args:
            document_id: Document ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM documents WHERE id = %s", (document_id,))
                deleted = cur.rowcount > 0
                conn.commit()
                if deleted:
                    logger.info(f"Deleted document {document_id} and its chunks")
                return deleted
    
    def get_document_count(self) -> int:
        """Get total number of documents."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as count FROM documents")
                result = cur.fetchone()
                return result['count']
    
    def get_chunk_count(self) -> int:
        """Get total number of chunks."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as count FROM document_chunks")
                result = cur.fetchone()
                return result['count']
