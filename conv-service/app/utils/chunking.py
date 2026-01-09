"""
Text chunking utilities for RAG indexing.
Uses tiktoken for token-based chunking with overlap.
"""
import logging
from typing import List, Dict, Any
import tiktoken

logger = logging.getLogger(__name__)


class TextChunker:
    """Chunks text into overlapping segments based on token count."""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        encoding_name: str = "cl100k_base"  # Used by GPT-4 and text-embedding-3-*
    ):
        """
        Initialize the text chunker.
        
        Args:
            chunk_size: Maximum tokens per chunk
            chunk_overlap: Number of overlapping tokens between chunks
            encoding_name: Tokenizer encoding to use
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.encoding = tiktoken.get_encoding(encoding_name)
        logger.info(f"TextChunker initialized: {chunk_size} tokens/chunk, {chunk_overlap} overlap")
    
    def chunk_text(
        self,
        text: str,
        metadata: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Chunk text into overlapping segments.
        
        Args:
            text: Text to chunk
            metadata: Optional metadata to attach to each chunk
            
        Returns:
            List of chunk dictionaries with text, token_count, and metadata
        """
        if not text or not text.strip():
            logger.warning("Empty text provided to chunker")
            return []
        
        # Tokenize the entire text
        tokens = self.encoding.encode(text)
        total_tokens = len(tokens)
        
        logger.info(f"Chunking text: {total_tokens} tokens")
        
        chunks = []
        start_idx = 0
        chunk_index = 0
        prev_start = -1
        
        while start_idx < total_tokens:
            # Safety check: prevent infinite loop
            if start_idx == prev_start:
                logger.error(f"Infinite loop detected at index {start_idx}, breaking")
                break
            prev_start = start_idx
            
            # Calculate end index
            end_idx = min(start_idx + self.chunk_size, total_tokens)
            
            # Extract chunk tokens and decode
            chunk_tokens = tokens[start_idx:end_idx]
            chunk_text = self.encoding.decode(chunk_tokens)
            
            # Create chunk metadata
            chunk_meta = {
                "chunk_index": chunk_index,
                "start_token": start_idx,
                "end_token": end_idx,
                "token_count": len(chunk_tokens),
                **(metadata or {})
            }
            
            chunks.append({
                "text": chunk_text,
                "metadata": chunk_meta
            })
            
            chunk_index += 1
            
            # Progress logging every 10 chunks
            if chunk_index % 10 == 0:
                logger.info(f"  ... processed {chunk_index} chunks ({start_idx}/{total_tokens} tokens)")
            
            # Move start index forward, accounting for overlap
            # If we're at the end, break
            if end_idx >= total_tokens:
                break
                
            start_idx = end_idx - self.chunk_overlap
            
            # Ensure we're making progress
            if self.chunk_overlap >= self.chunk_size:
                logger.warning(f"Overlap ({self.chunk_overlap}) >= chunk size ({self.chunk_size}), using no overlap")
                start_idx = end_idx
        
        logger.info(f"✅ Created {len(chunks)} chunks from {total_tokens} tokens")
        return chunks
