"""Embedding generation via Google Gemini (text-embedding-004, 768 dims)."""

from __future__ import annotations

from typing import List

import google.generativeai as genai

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set; cannot generate embeddings")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


def _embed(texts: List[str], task_type: str) -> List[List[float]]:
    _ensure_configured()
    vectors: List[List[float]] = []
    batch = settings.EMBED_BATCH_SIZE
    for i in range(0, len(texts), batch):
        window = texts[i : i + batch]
        result = genai.embed_content(
            model=settings.EMBED_MODEL,
            content=window,
            task_type=task_type,
            output_dimensionality=settings.EMBED_DIM,
        )
        emb = result["embedding"]
        # The API returns a single list for one input, list-of-lists for many.
        if window and isinstance(emb[0], (int, float)):
            emb = [emb]
        vectors.extend(emb)
    return vectors


def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed chunk texts for storage (retrieval_document task)."""
    if not texts:
        return []
    logger.info("Embedding %d document chunk(s)", len(texts))
    return _embed(texts, task_type="retrieval_document")


def embed_query(text: str) -> List[float]:
    """Embed a search query (retrieval_query task)."""
    return _embed([text], task_type="retrieval_query")[0]
