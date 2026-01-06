"""
Embedding client for generating text embeddings via Google Gemini API.
Includes batching, retry logic, and optional caching.
"""
import logging
import time
from typing import List, Optional
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingClient:
    """Client for generating text embeddings."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        batch_size: int = 50  # Gemini can handle larger batches
    ):
        """
        Initialize the embedding client.
        
        Args:
            api_key: Gemini API key (uses settings.GEMINI_API_KEY if not provided)
            model: Embedding model (uses settings.GEMINI_EMBEDDING_MODEL if not provided)
            batch_size: Maximum texts to embed in a single API call (50 is good for Gemini)
        """
        api_key = api_key or settings.GEMINI_API_KEY
        genai.configure(api_key=api_key)
        self.model = model or settings.GEMINI_EMBEDDING_MODEL
        self.batch_size = batch_size
        logger.info(f"EmbeddingClient initialized: model={self.model}, batch_size={batch_size}")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        return self.embed_texts([text])[0]
    
    def embed_texts(self, texts: List[str], retry_count: int = 3) -> List[List[float]]:
        """
        Generate embeddings for multiple texts with retry logic.
        
        Args:
            texts: List of texts to embed
            retry_count: Number of retries on failure
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        all_embeddings = []
        total_batches = (len(texts) + self.batch_size - 1) // self.batch_size
        
        logger.info(f"Generating embeddings for {len(texts)} texts in {total_batches} batches...")
        
        # Process in batches (Gemini can handle batch requests)
        for batch_num in range(0, len(texts), self.batch_size):
            batch = texts[batch_num:batch_num + self.batch_size]
            batch_idx = batch_num // self.batch_size + 1
            
            logger.info(f"Processing batch {batch_idx}/{total_batches} ({len(batch)} texts)...")
            
            for attempt in range(retry_count):
                try:
                    # Use batch embedding for efficiency
                    result = genai.embed_content(
                        model=self.model,
                        content=batch,
                        task_type="retrieval_document"
                    )
                    
                    # Extract embeddings from result
                    if isinstance(result['embedding'][0], list):
                        # Already a list of embeddings
                        batch_embeddings = result['embedding']
                    else:
                        # Single embedding, wrap in list
                        batch_embeddings = [result['embedding']]
                    
                    all_embeddings.extend(batch_embeddings)
                    
                    logger.info(f"✅ Batch {batch_idx}/{total_batches} complete ({len(batch_embeddings)} embeddings, dim={len(batch_embeddings[0])})")
                    
                    # Small delay between batches to respect rate limits
                    if batch_idx < total_batches:
                        time.sleep(1)
                    break
                    
                except Exception as e:
                    if attempt < retry_count - 1:
                        wait_time = 2 ** attempt  # Exponential backoff
                        logger.warning(f"Batch {batch_idx} failed (attempt {attempt + 1}/{retry_count}): {e}. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Batch {batch_idx} failed after {retry_count} attempts: {e}")
                        raise
        
        logger.info(f"✅ All embeddings complete! Generated {len(all_embeddings)} embeddings")
        return all_embeddings
    
    def get_dimension(self) -> int:
        """
        Get the embedding dimension for the current model.
        
        Returns:
            Embedding dimension (768 for Gemini embedding-001)
        """
        # Use settings or test with a small string
        test_embedding = self.embed_text("test")
        return len(test_embedding)
