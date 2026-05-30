"""REST API for the kakilleAI human-in-the-loop RAG builder."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.repositories import document as repo
from app.schemas.document import (
    ChunkOut,
    DocumentOut,
    MarkdownIn,
    MarkdownOut,
    ParseNewResult,
    SearchIn,
    SearchOut,
)
from app.services import rag

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_or_404(db: Session, doc_id: int):
    doc = repo.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    return repo.list_documents(db)


@router.post("/scan", response_model=ParseNewResult)
def scan_and_parse(db: Session = Depends(get_db)):
    """Parsing hook: register new PDFs in DATA_DIR and parse the unparsed ones.

    Already-parsed/indexed documents (and their Markdown edits) are preserved.
    """
    return rag.parse_new(db)


@router.post("/upload", response_model=DocumentOut)
def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Add a new PDF to DATA_DIR and register it (status: pending)."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are accepted")
    if repo.get_by_filename(db, file.filename):
        raise HTTPException(
            status_code=409,
            detail=f"A document named '{file.filename}' already exists",
        )

    os.makedirs(settings.DATA_DIR, exist_ok=True)
    dest = os.path.join(settings.DATA_DIR, file.filename)
    with open(dest, "wb") as out:
        out.write(file.file.read())

    doc = repo.create_document(db, file.filename, dest)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, doc_id)


@router.post("/{doc_id}/parse", response_model=DocumentOut)
def parse_document(
    doc_id: int,
    force: bool = Query(False, description="Re-parse even if already parsed "
                                          "(discards human Markdown edits)"),
    db: Session = Depends(get_db),
):
    doc = _get_or_404(db, doc_id)
    try:
        return rag.parse_document(db, doc, force=force)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{doc_id}/markdown", response_model=MarkdownOut)
def get_markdown(doc_id: int, db: Session = Depends(get_db)):
    doc = _get_or_404(db, doc_id)
    if not doc.markdown_path or not os.path.exists(doc.markdown_path):
        raise HTTPException(
            status_code=404,
            detail="Markdown not generated yet; parse the document first",
        )
    with open(doc.markdown_path, "r", encoding="utf-8") as f:
        content = f.read()
    return MarkdownOut(
        document_id=doc.id,
        source_filename=doc.source_filename,
        content=content,
    )


@router.put("/{doc_id}/markdown", response_model=DocumentOut)
def update_markdown(doc_id: int, body: MarkdownIn, db: Session = Depends(get_db)):
    """Save human-edited Markdown. Indexed documents become stale until re-approved."""
    doc = _get_or_404(db, doc_id)
    return rag.save_markdown(db, doc, body.content)


@router.post("/{doc_id}/approve", response_model=DocumentOut)
def approve_document(doc_id: int, db: Session = Depends(get_db)):
    """Approve the current Markdown and (re)build this document's vector index."""
    doc = _get_or_404(db, doc_id)
    try:
        return rag.approve_and_index(db, doc)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{doc_id}/chunks", response_model=list[ChunkOut])
def get_chunks(doc_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, doc_id)
    return repo.get_chunks(db, doc_id)


# Mounted separately in main (not under /documents) — see app.main.
search_router = APIRouter(tags=["search"])


@search_router.post("/search", response_model=SearchOut)
def search(body: SearchIn, db: Session = Depends(get_db)):
    hits = rag.search(db, body.query, top_k=body.top_k, document_id=body.document_id)
    return SearchOut(query=body.query, hits=hits)
