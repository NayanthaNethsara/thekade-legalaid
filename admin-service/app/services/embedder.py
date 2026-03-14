"""Embedder — generates 768-dim vectors using Google text-embedding-004.

Supports batching to stay within API rate limits.
"""

import logging
from typing import Optional

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

MODEL_NAME = "models/text-embedding-004"
BATCH_SIZE = 100  # Google allows up to 100 texts per batch
DIMENSIONS = 768


def _configure() -> None:
    """Ensure the SDK is configured with the API key."""
    genai.configure(api_key=settings.GEMINI_API_KEY)


def embed_texts(
    texts: list[str],
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
    title: Optional[str] = None,
) -> list[list[float]]:
    """Embed a list of texts and return 768-dim vectors.

    Args:
        texts: The texts to embed.
        task_type: "RETRIEVAL_DOCUMENT" for indexing, "RETRIEVAL_QUERY" for search.
        title: Optional document title for better embeddings.

    Returns:
        List of embedding vectors, same order and length as *texts*.
    """
    if not texts:
        return []

    _configure()

    all_embeddings: list[list[float]] = []

    for batch_start in range(0, len(texts), BATCH_SIZE):
        batch = texts[batch_start : batch_start + BATCH_SIZE]

        kwargs: dict = {
            "model": MODEL_NAME,
            "content": batch,
            "task_type": task_type,
            "output_dimensionality": DIMENSIONS,
        }
        if title:
            kwargs["title"] = title

        result = genai.embed_content(**kwargs)
        embeddings = result["embedding"]

        # embed_content returns a single list for single input,
        # or list-of-lists for multiple inputs.
        if batch_start == 0 and len(batch) == 1 and isinstance(embeddings[0], float):
            embeddings = [embeddings]

        all_embeddings.extend(embeddings)
        logger.info(
            f"Embedded batch {batch_start // BATCH_SIZE + 1} "
            f"({len(batch)} texts)"
        )

    return all_embeddings


def embed_query(query: str) -> list[float]:
    """Embed a single search query (uses RETRIEVAL_QUERY task type)."""
    result = embed_texts([query], task_type="RETRIEVAL_QUERY")
    return result[0]
