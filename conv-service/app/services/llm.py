"""
LLM client for RAG answer generation using Google Gemini.
"""
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for generating answers via Gemini."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "models/gemini-2.5-flash"
    ):
        """
        Initialize the LLM client.
        
        Args:
            api_key: Gemini API key (uses settings.GEMINI_API_KEY if not provided)
            model: Gemini model to use for generation
        """
        api_key = api_key or settings.GEMINI_API_KEY
        self.client = genai.Client(api_key=api_key)
        self.model_name = model
        logger.info(f"LLMClient initialized: model={model}")
    
    def generate_answer(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]],
        max_tokens: int = 1000,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Generate an answer to a question using retrieved context.
        
        Args:
            question: User's question
            context_chunks: Retrieved document chunks with metadata
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (lower = more focused)
            
        Returns:
            Dict with 'answer' and 'citations'
        """
        # Build prompt with context and citations
        prompt = self._build_prompt(question, context_chunks)
        
        logger.info(f"Generating answer for question: {question[:100]}...")
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature,
                )
            )
            
            answer = response.text
            
            # Extract citations from context chunks
            citations = self._extract_citations(context_chunks)
            
            logger.info(f"Generated answer ({len(answer)} chars) with {len(citations)} citations")
            
            return {
                "answer": answer,
                "citations": citations
            }
            
        except Exception as e:
            logger.error(f"Failed to generate answer: {e}")
            raise
    
    def _build_prompt(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]]
    ) -> str:
        """Build a prompt with question and context."""
        
        # Format context chunks with citations
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            filename = chunk.get('document_metadata', {}).get('filename', 'Unknown')
            text = chunk['text']
            context_parts.append(
                f"[Source {i}: {filename}, Chunk {chunk['chunk_index']}]\n{text}\n"
            )
        
        context_text = "\n".join(context_parts)
        
        prompt = f"""You are a legal assistant specializing in Sri Lankan law. Answer the user's question based ONLY on the provided legal document excerpts. Always cite your sources using [Source N] format.

If the answer is not in the provided documents, say "I don't have enough information in the provided documents to answer this question."

Be precise and cite specific sections when possible.

LEGAL DOCUMENTS:
{context_text}

USER QUESTION:
{question}

ANSWER (with citations):"""
        
        return prompt
    
    def _extract_citations(
        self,
        context_chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract citation information from context chunks."""
        citations = []
        for i, chunk in enumerate(context_chunks, 1):
            doc_metadata = chunk.get('document_metadata', {})
            citations.append({
                "source_number": i,
                "document_id": chunk['document_id'],
                "chunk_id": chunk['id'],
                "chunk_index": chunk['chunk_index'],
                "filename": doc_metadata.get('filename', 'Unknown'),
                "file_type": doc_metadata.get('file_type', ''),
                "distance": float(chunk['distance']),
                "excerpt": chunk['text'][:200] + "..." if len(chunk['text']) > 200 else chunk['text']
            })
        return citations
