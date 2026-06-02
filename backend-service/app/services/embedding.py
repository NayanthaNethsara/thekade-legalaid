"""Embedding generation via Google Gemini (gemini-embedding-001, 768 dims).
"""

from __future__ import annotations

from typing import List, Optional

from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set; cannot generate embeddings")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _model_id() -> str:
    # google-genai accepts a bare model id; tolerate a "models/" prefix in config.
    return settings.EMBED_MODEL.removeprefix("models/")


def _embed(texts: List[str], task_type: str) -> List[List[float]]:
    client = _get_client()
    config = types.EmbedContentConfig(
        task_type=task_type,
        output_dimensionality=settings.EMBED_DIM,
    )

    vectors: List[List[float]] = []
    batch = settings.EMBED_BATCH_SIZE
    for i in range(0, len(texts), batch):
        window = texts[i : i + batch]
        response = client.models.embed_content(
            model=_model_id(),
            contents=window,
            config=config,
        )
        vectors.extend(e.values for e in response.embeddings)
    return vectors


def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed chunk texts for storage (RETRIEVAL_DOCUMENT task)."""
    if not texts:
        return []
    logger.info("Embedding %d document chunk(s)", len(texts))
    return _embed(texts, task_type="RETRIEVAL_DOCUMENT")


def embed_query(text: str) -> List[float]:
    """Embed a search query (RETRIEVAL_QUERY task)."""
    return _embed([text], task_type="RETRIEVAL_QUERY")[0]
