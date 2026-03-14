from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories.document import DocumentRepository
from app.services import document as doc_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("")
def list_documents(
    limit: int = Query(10, ge=1, le=100, description="Number of items to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """List ingested documents with pagination."""
    repo = DocumentRepository(db)
    return doc_service.list_documents(repo, limit=limit, offset=offset)


@router.get("/{document_id}")
def get_document(
    document_id: int,
    include_chunks: bool = Query(True, description="Whether to include the embedded chunks"),
    db: Session = Depends(get_db),
):
    """Get full details for a specific document, optionally including its chunks."""
    repo = DocumentRepository(db)
    return doc_service.get_document_details(repo, document_id, include_chunks=include_chunks)
