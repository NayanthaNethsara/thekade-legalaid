"""Human-in-the-loop RAG orchestration for kakilleAI.

Lifecycle per source document:

  scan/parse   PDF  -> Markdown on disk            (status: parsed)
  human edits  Markdown via editor or PUT API
  approve      Markdown -> chunks -> embeddings    (status: indexed)

Indexing is strictly per-file: approving (or re-approving) one document deletes
only that document's chunks and rebuilds them, so other documents are never
touched. Re-approving an edited document cleans the previous chunks and redoes
just that file.
"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import DocStatus, RagChunk, RagDocument
from app.repositories import document as repo
from app.services import parser
from app.services.chunker import chunk_markdown
from app.services.embedding import embed_documents, embed_query
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _read_markdown(doc: RagDocument) -> str:
    if not doc.markdown_path or not os.path.exists(doc.markdown_path):
        raise FileNotFoundError(
            f"Markdown for '{doc.source_filename}' not found; parse it first"
        )
    with open(doc.markdown_path, "r", encoding="utf-8") as f:
        return f.read()


# --------------------------------------------------------------------------- scan
def scan_data_dir(db: Session) -> List[RagDocument]:
    """Register any new PDFs in DATA_DIR that aren't tracked yet.

    Returns the documents that were newly created (status ``pending``).
    """
    from app.core.config import settings

    data_dir = settings.DATA_DIR
    os.makedirs(data_dir, exist_ok=True)

    created: List[RagDocument] = []
    for name in sorted(os.listdir(data_dir)):
        if not name.lower().endswith(".pdf"):
            continue
        if repo.get_by_filename(db, name):
            continue
        path = os.path.join(data_dir, name)
        created.append(repo.create_document(db, name, path))
        logger.info("Registered new document: %s", name)
    return created


# -------------------------------------------------------------------------- parse
def parse_document(db: Session, doc: RagDocument, force: bool = False) -> RagDocument:
    """Parse one document's PDF to Markdown.

    Refuses to overwrite existing Markdown (which may contain human edits)
    unless ``force`` is set.
    """
    already_parsed = doc.status in (DocStatus.PARSED, DocStatus.INDEXED)
    if already_parsed and not force:
        raise ValueError(
            f"'{doc.source_filename}' is already parsed; pass force=true to "
            "re-parse (this discards human edits to the Markdown)"
        )

    try:
        md_path = parser.parse_pdf_to_markdown(doc.source_path, doc.source_filename)
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()
        doc.markdown_path = md_path
        doc.markdown_hash = _hash(content)
        doc.status = DocStatus.PARSED
        doc.error = None
        doc.parsed_at = _now()
    except Exception as exc:  # noqa: BLE001
        doc.status = DocStatus.ERROR
        doc.error = str(exc)
        logger.exception("Failed to parse %s", doc.source_filename)
        db.commit()
        raise

    db.commit()
    db.refresh(doc)
    return doc


def parse_new(db: Session) -> dict:
    """The parsing 'hook': register new PDFs and parse everything not parsed yet.

    Documents already parsed/indexed are left alone (their Markdown — and any
    human edits — is preserved).
    """
    scan_data_dir(db)
    db.commit()

    pending = db.scalars(
        select(RagDocument).where(RagDocument.status == DocStatus.PENDING)
    ).all()

    parsed, errors = [], []
    for doc in pending:
        try:
            parse_document(db, doc, force=False)
            parsed.append(doc.source_filename)
        except Exception as exc:  # noqa: BLE001
            errors.append({"file": doc.source_filename, "error": str(exc)})

    return {"parsed": parsed, "errors": errors}


# -------------------------------------------------------------------- edit markdown
def save_markdown(db: Session, doc: RagDocument, content: str) -> RagDocument:
    """Persist human-edited Markdown to disk and update the tracked hash.

    If the document was already indexed, it becomes stale (markdown_hash now
    differs from indexed_hash) and must be re-approved.
    """
    if not doc.markdown_path:
        doc.markdown_path = parser.markdown_path_for(doc.source_filename)
    os.makedirs(os.path.dirname(doc.markdown_path), exist_ok=True)
    with open(doc.markdown_path, "w", encoding="utf-8") as f:
        f.write(content)

    doc.markdown_hash = _hash(content)
    if doc.status == DocStatus.PENDING:
        doc.status = DocStatus.PARSED
    db.commit()
    db.refresh(doc)
    return doc


# ------------------------------------------------------------------------- approve
def approve_and_index(db: Session, doc: RagDocument) -> RagDocument:
    """Build (or rebuild) the vector index for a single document.

    Cleans this document's existing chunks first, then re-chunks and re-embeds
    the current Markdown. Other documents are untouched.
    """
    content = _read_markdown(doc)
    md_hash = _hash(content)

    chunks = chunk_markdown(content)
    if not chunks:
        raise ValueError(
            f"'{doc.source_filename}' produced no chunks; nothing to index"
        )

    try:
        vectors = embed_documents([c.content for c in chunks])

        # Per-file clean rebuild.
        deleted = repo.delete_chunks_for(db, doc.id)
        if deleted:
            logger.info("Cleared %d existing chunk(s) for %s", deleted,
                        doc.source_filename)

        for chunk, vector in zip(chunks, vectors):
            db.add(
                RagChunk(
                    document_id=doc.id,
                    chunk_index=chunk.index,
                    heading=chunk.heading,
                    content=chunk.content,
                    token_count=chunk.token_count,
                    embedding=vector,
                )
            )

        doc.chunk_count = len(chunks)
        doc.markdown_hash = md_hash
        doc.indexed_hash = md_hash
        doc.status = DocStatus.INDEXED
        doc.error = None
        doc.indexed_at = _now()
        db.commit()
        db.refresh(doc)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        doc.status = DocStatus.ERROR
        doc.error = str(exc)
        db.commit()
        logger.exception("Failed to index %s", doc.source_filename)
        raise

    logger.info("Indexed %s with %d chunk(s)", doc.source_filename, len(chunks))
    return doc


# -------------------------------------------------------------------------- delete
def delete_document(db: Session, doc: RagDocument, drop: bool = False):
    """Remove a document's Markdown and all of its RAG chunks.

    Clearing the Markdown clears every chunk derived from it (the whole file is
    un-indexed). By default the tracking row and the source PDF are kept and the
    document is reset to ``pending`` so it can be re-parsed later. Pass
    ``drop=True`` to remove the tracking row entirely as well.

    Returns the reset document, or ``None`` when dropped.
    """
    deleted = repo.delete_chunks_for(db, doc.id)
    if deleted:
        logger.info("Cleared %d chunk(s) for %s", deleted, doc.source_filename)

    if doc.markdown_path and os.path.exists(doc.markdown_path):
        os.remove(doc.markdown_path)
        logger.info("Removed Markdown for %s", doc.source_filename)

    if drop:
        db.delete(doc)
        db.commit()
        logger.info("Dropped tracking row for %s", doc.source_filename)
        return None

    doc.markdown_path = None
    doc.markdown_hash = None
    doc.indexed_hash = None
    doc.chunk_count = 0
    doc.status = DocStatus.PENDING
    doc.error = None
    doc.parsed_at = None
    doc.indexed_at = None
    db.commit()
    db.refresh(doc)
    return doc


# -------------------------------------------------------------------------- search
def search(db: Session, query: str, top_k: int = 5,
           document_id: Optional[int] = None) -> List[dict]:
    """Cosine-similarity search across indexed chunks (optionally one document)."""
    query_vec = embed_query(query)
    distance = RagChunk.embedding.cosine_distance(query_vec)

    stmt = (
        select(RagChunk, distance.label("distance"))
        .order_by(distance)
        .limit(top_k)
    )
    if document_id is not None:
        stmt = stmt.where(RagChunk.document_id == document_id)

    results = []
    for chunk, dist in db.execute(stmt).all():
        results.append(
            {
                "document_id": chunk.document_id,
                "chunk_index": chunk.chunk_index,
                "heading": chunk.heading,
                "content": chunk.content,
                "score": 1.0 - float(dist),
            }
        )
    return results
