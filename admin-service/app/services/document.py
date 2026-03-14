"""Document service — business logic for viewing stored knowledge."""

from fastapi import HTTPException

from app.repositories.document import DocumentRepository


def list_documents(repo: DocumentRepository, limit: int = 10, offset: int = 0) -> dict:
    """Get a paginated list of ingested documents."""
    docs = repo.get_paginated(limit=limit, offset=offset)
    total = repo.count_documents()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": doc.id,
                "source": doc.source,
                "created_at": doc.created_at,
                "metadata": doc.metadata_,
                "preview": f"{doc.content[:200]}..." if doc.content and len(doc.content) > 200 else doc.content,
            }
            for doc in docs
        ]
    }


def get_document_details(repo: DocumentRepository, document_id: int, include_chunks: bool = True) -> dict:
    """Get full document details, optionally including chunks."""
    doc = repo.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    result = {
        "id": doc.id,
        "source": doc.source,
        "source_id": doc.source_id,
        "created_at": doc.created_at,
        "metadata": doc.metadata_,
        "content_length": len(doc.content) if doc.content else 0,
        "content_preview": f"{doc.content[:500]}..." if doc.content and len(doc.content) > 500 else doc.content,
    }
    
    if include_chunks:
        result["chunks"] = repo.get_chunks_for_document(document_id)
        
    return result
