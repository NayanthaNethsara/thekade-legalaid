"""
Embedding client for generating text embeddings via OpenAI API.
Includes batching, retry logic, and optional caching.
"""
import logging
import time
from typing import List, Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingClient:
    """Client for generating text embeddings."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        batch_size: int = 100
    ):
        """
        Initialize the embedding client.
        
        Args:
            api_key: OpenAI API key (uses settings.OPENAI_API_KEY if not provided)
            model: Embedding model (uses settings.OPENAI_EMBEDDING_MODEL if not provided)
            batch_size: Maximum texts to embed in a single API call
        """
        self.client = OpenAI(api_key=api_key or settings.OPENAI_API_KEY)
        self.model = model or settings.OPENAI_EMBEDDING_MODEL
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
        
        # Process in batches
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            logger.info(f"Embedding batch {i//self.batch_size + 1} ({len(batch)} texts)")
            
            for attempt in range(retry_count):
                try:
                    response = self.client.embeddings.create(
                        model=self.model,
                        input=batch
                    )
                    
                    # Extract embeddings in order
                    batch_embeddings = [item.embedding for item in response.data]
                    all_embeddings.extend(batch_embeddings)
                    
                    logger.info(f"Successfully embedded {len(batch)} texts (dim={len(batch_embeddings[0])})")
                    break
                    
                except Exception as e:
                    if attempt < retry_count - 1:
                        wait_time = 2 ** attempt  # Exponential backoff
                        logger.warning(f"Embedding failed (attempt {attempt + 1}/{retry_count}): {e}. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Embedding failed after {retry_count} attempts: {e}")
                        raise
        
        return all_embeddings
    
    def get_dimension(self) -> int:
        """
        Get the embedding dimension for the current model.
        
        Returns:
            Embedding dimension (e.g., 1536 for text-embedding-3-small)
        """
        # Use settings or test with a small string
        test_embedding = self.embed_text("test")
        return len(test_embedding)
