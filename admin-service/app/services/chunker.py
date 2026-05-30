"""Markdown-aware chunking.

Splits a Markdown document into section-aligned chunks suitable for embedding.
We break on headings first (so a chunk stays within one logical section), then
window oversized sections by character count with a small overlap so context is
not lost across boundaries.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from app.core.config import settings

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")


@dataclass
class Chunk:
    index: int
    content: str
    heading: Optional[str]

    @property
    def token_count(self) -> int:
        # Rough heuristic: ~4 chars per token. Good enough for budgeting/metadata.
        return max(1, len(self.content) // 4)


def _split_section(text: str, max_chars: int, overlap: int) -> List[str]:
    """Window a long section into overlapping pieces, preferring paragraph breaks."""
    if len(text) <= max_chars:
        return [text]

    pieces: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        if end < n:
            # Try to break on a paragraph or line boundary near the window end.
            window = text[start:end]
            split_at = window.rfind("\n\n")
            if split_at < max_chars // 2:
                split_at = window.rfind("\n")
            if split_at > max_chars // 2:
                end = start + split_at
        pieces.append(text[start:end].strip())
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return [p for p in pieces if p]


def chunk_markdown(
    markdown: str,
    max_chars: Optional[int] = None,
    overlap: Optional[int] = None,
) -> List[Chunk]:
    max_chars = max_chars or settings.CHUNK_MAX_CHARS
    overlap = overlap or settings.CHUNK_OVERLAP

    # Group lines into sections led by their nearest heading.
    sections: List[tuple] = []  # (heading, body_text)
    current_heading: Optional[str] = None
    buf: List[str] = []

    for line in markdown.splitlines():
        m = _HEADING_RE.match(line.strip())
        if m:
            if buf:
                sections.append((current_heading, "\n".join(buf).strip()))
                buf = []
            current_heading = m.group(2).strip()
        buf.append(line)
    if buf:
        sections.append((current_heading, "\n".join(buf).strip()))

    chunks: List[Chunk] = []
    idx = 0
    for heading, body in sections:
        if not body.strip():
            continue
        for piece in _split_section(body, max_chars, overlap):
            if piece.strip():
                chunks.append(Chunk(index=idx, content=piece, heading=heading))
                idx += 1
    return chunks
