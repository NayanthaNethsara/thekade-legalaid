"""File parser — extracts text from PDF, DOCX, TXT, and MD files."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


def parse_file(path: Path) -> str:
    """Extract text content from a file.

    Returns empty string for unsupported types or on error.
    """
    ext = path.suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        logger.warning(f"Unsupported file type: {ext} ({path.name})")
        return ""

    try:
        if ext == ".pdf":
            return _parse_pdf(path)
        elif ext == ".docx":
            return _parse_docx(path)
        else:
            return _parse_text(path)
    except Exception as exc:
        logger.error(f"Failed to parse {path.name}: {exc}")
        return ""


def _parse_pdf(path: Path) -> str:
    """Extract text from PDF using PyMuPDF."""
    import fitz  # PyMuPDF

    doc = fitz.open(str(path))
    pages: list[str] = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text.strip())
    doc.close()

    content = "\n\n".join(pages)
    logger.info(f"PDF '{path.name}': {len(pages)} pages, {len(content)} chars")
    return content


def _parse_docx(path: Path) -> str:
    """Extract text from DOCX using python-docx."""
    import docx

    doc = docx.Document(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    content = "\n\n".join(paragraphs)
    logger.info(f"DOCX '{path.name}': {len(paragraphs)} paragraphs, {len(content)} chars")
    return content


def _parse_text(path: Path) -> str:
    """Read plain text or markdown."""
    content = path.read_text(encoding="utf-8", errors="replace")
    logger.info(f"TXT '{path.name}': {len(content)} chars")
    return content
