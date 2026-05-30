"""PDF -> Markdown parsing using pymupdf4llm (deterministic, offline)."""

from __future__ import annotations

import os

import pymupdf4llm

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def markdown_path_for(source_filename: str) -> str:
    """Markdown output path for a given source filename."""
    stem, _ = os.path.splitext(os.path.basename(source_filename))
    return os.path.join(settings.MARKDOWN_DIR, f"{stem}.md")


def parse_pdf_to_markdown(source_path: str, source_filename: str) -> str:
    """Convert a PDF to Markdown, write it to disk, and return the output path.

    Overwrites any existing Markdown for the same file (callers guard against
    clobbering human edits via the ``force`` flag).
    """
    os.makedirs(settings.MARKDOWN_DIR, exist_ok=True)
    out_path = markdown_path_for(source_filename)

    logger.info("Parsing %s -> %s", source_filename, out_path)
    markdown = pymupdf4llm.to_markdown(source_path, show_progress=False)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(markdown)

    logger.info("Wrote %d chars of Markdown for %s", len(markdown), source_filename)
    return out_path
