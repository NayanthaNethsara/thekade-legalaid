import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.repositories.document import DocumentRepository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/status")
def status(db: Session = Depends(get_db)):
    """Return document and chunk counts."""
    try:
        repo = DocumentRepository(db)
        
        return {
            "documents": repo.count_documents(),
            "chunks": repo.count_chunks(),
            "last_ingested": str(repo.get_last_ingested_time()),
            "data_dir": settings.DATA_DIR,
        }
    except Exception as exc:
        logger.error(f"Status check failed: {exc}")
        return {"error": str(exc)}
