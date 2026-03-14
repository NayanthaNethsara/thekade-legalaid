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

    # 3. Store the parent Document first
    metadata = {
        "filename": path.name,
        "extension": path.suffix.lower(),
        "file_size": path.stat().st_size,
        "total_chars": len(content),
        "total_chunks": len(chunks),
    }

    doc = repo.create_document(
        source=source,
        source_id=source_id,
        content=content[:10000],  # preview
        metadata=metadata,
    )

    # 4. Embed and store chunks in batches to prevent OOM
    BATCH_SIZE = 100
    try:
        for i in range(0, len(chunks), BATCH_SIZE):
            batch_chunks = chunks[i : i + BATCH_SIZE]
            chunk_texts = [c.text for c in batch_chunks]
            
            embeddings = embed_texts(chunk_texts, title=path.stem)
            repo.add_chunks_to_document(doc.id, path.name, batch_chunks, embeddings)
            logger.info(f"Processed chunks {i} to {i + len(batch_chunks)} for '{path.name}'")
    except Exception as e:
        logger.error(f"Failed to process chunk batch for '{path.name}': {e}. Deleting partial document.")
        repo.db.delete(doc)
        repo.db.commit()
        raise

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
