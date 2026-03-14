"""Text chunker — splits documents into overlapping chunks.

Uses a recursive character-based strategy to produce chunks that are
roughly ``chunk_size`` characters with ``chunk_overlap`` overlap.
"""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    index: int
    text: str


def chunk_text(
    text: str,
    *,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[Chunk]:
    """Split *text* into overlapping chunks.

    Returns an empty list if *text* is blank.
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    chunks: list[Chunk] = []
    start = 0
    idx = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at a sentence/paragraph boundary.
        if end < len(text):
            # Look for the last newline or period within the window.
            for sep in ["\n\n", "\n", ". ", "? ", "! "]:
                last = text.rfind(sep, start, end)
                if last > start:
                    end = last + len(sep)
                    break

        chunk_text_str = text[start:end].strip()
        if chunk_text_str:
            chunks.append(Chunk(index=idx, text=chunk_text_str))
            idx += 1

        new_start = end - chunk_overlap
        # CRITICAL: ensure start always advances forward to prevent infinite loops!
        start = max(start + 1, new_start)

    logger.info(f"Chunked {len(text)} chars into {len(chunks)} chunks")
    return chunks
