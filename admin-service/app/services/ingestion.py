"""Ingestion service — orchestrates file → chunks → embeddings → DB.

Handles the full pipeline: parse files, chunk text, generate embeddings,
and store in the documents + document_chunks tables via the repository layer.
"""

import hashlib
import logging
from pathlib import Path

from app.repositories.document import DocumentRepository
from app.services.chunker import chunk_text
from app.services.embedder import embed_texts
from app.services.parser import parse_file, SUPPORTED_EXTENSIONS

logger = logging.getLogger(__name__)


def _file_hash(path: Path) -> str:
    """Compute a stable hash for deduplication."""
    h = hashlib.sha256()
    h.update(path.name.encode())
    h.update(str(path.stat().st_size).encode())
    return h.hexdigest()[:16]


def ingest_file(repo: DocumentRepository, path: Path, *, source: str = "admin-train") -> dict:
    """Ingest a single file: parse → chunk → embed → store."""
    source_id = _file_hash(path)

    if repo.get_by_source_id(source_id):
        logger.info(f"Skipping '{path.name}' — already ingested (source_id={source_id})")
        return {
            "file": path.name,
            "status": "skipped",
            "reason": "already ingested",
        }

    # 1. Parse
    content = parse_file(path)
    if not content.strip():
        return {
            "file": path.name,
            "status": "skipped",
            "reason": "no text content extracted",
        }

    # 2. Chunk
    chunks = chunk_text(content, chunk_size=500, chunk_overlap=50)
    if not chunks:
        return {
            "file": path.name,
            "status": "skipped",
            "reason": "no chunks produced",
        }

    # 3. Embed
    chunk_texts = [c.text for c in chunks]
    embeddings = embed_texts(chunk_texts, title=path.stem)

    if len(embeddings) != len(chunks):
        return {
            "file": path.name,
            "status": "error",
            "reason": f"embedding count mismatch: {len(embeddings)} vs {len(chunks)}",
        }

    # 4. Store via repository
    metadata = {
        "filename": path.name,
        "extension": path.suffix.lower(),
        "file_size": path.stat().st_size,
        "total_chars": len(content),
        "total_chunks": len(chunks),
    }

    doc = repo.create_document_with_chunks(
        source=source,
        source_id=source_id,
        content=content[:10000],  # preview
        metadata=metadata,
        chunks=chunks,
        embeddings=embeddings,
    )

    logger.info(
        f"Ingested '{path.name}': doc_id={doc.id}, "
        f"{len(chunks)} chunks, {len(content)} chars"
    )

    return {
        "file": path.name,
        "status": "ingested",
        "document_id": doc.id,
        "chunks": len(chunks),
        "chars": len(content),
    }


def ingest_folder(repo: DocumentRepository, folder: Path, *, source: str = "admin-train") -> list[dict]:
    """Ingest all supported files from a folder."""
    if not folder.exists():
        logger.warning(f"Data folder does not exist: {folder}")
        return [{"status": "error", "reason": f"Folder not found: {folder}"}]

    files = [
        f for f in sorted(folder.iterdir())
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not files:
        return [{"status": "info", "reason": "No supported files found in data folder"}]

    results: list[dict] = []
    for path in files:
        try:
            result = ingest_file(repo, path, source=source)
            results.append(result)
        except Exception as exc:
            logger.error(f"Failed to ingest '{path.name}': {exc}")
            repo.db.rollback()
            results.append({
                "file": path.name,
                "status": "error",
                "reason": str(exc),
            })

    return results
