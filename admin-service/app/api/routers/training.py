import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.repositories.document import DocumentRepository
from app.services.ingestion import ingest_file, ingest_folder
from app.services.parser import SUPPORTED_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/train", tags=["training"])


@router.post("")
def train(db: Session = Depends(get_db)):
    """Ingest all supported files from the data folder.

    Files already ingested (by filename hash) are automatically skipped.
    """
    repo = DocumentRepository(db)
    data_path = Path(settings.DATA_DIR)
    logger.info(f"Training from folder: {data_path}")

    results = ingest_folder(repo, data_path)

    summary = {
        "ingested": sum(1 for r in results if r.get("status") == "ingested"),
        "skipped": sum(1 for r in results if r.get("status") == "skipped"),
        "errors": sum(1 for r in results if r.get("status") == "error"),
        "total_files": len(results),
    }

    return {"summary": summary, "details": results}


@router.post("/file")
async def train_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload and ingest a single file."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return {
            "status": "error",
            "reason": f"Unsupported file type: {ext}. Supported: {SUPPORTED_EXTENSIONS}",
        }

    # Save to a temp file, then ingest.
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    # Rename so the file hash uses the original filename.
    dest = tmp_path.parent / (file.filename or f"upload{ext}")
    shutil.move(str(tmp_path), str(dest))

    repo = DocumentRepository(db)
    try:
        result = ingest_file(repo, dest, source="admin-upload")
        return result
    finally:
        dest.unlink(missing_ok=True)
