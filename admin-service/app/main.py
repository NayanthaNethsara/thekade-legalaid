"""kakilleAI admin-service — human-in-the-loop RAG builder for legal documents.

Pipeline:
  PDF (data/)  --parse-->  Markdown (data/markdown/, human-editable)
               --approve-> chunks + Gemini embeddings  -> Postgres/pgvector

Indexing is per-file: approving one document never affects the others.
"""

import uvicorn
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.documents import router as documents_router
from app.api.documents import search_router
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

app = FastAPI(
    title="kakilleAI Admin — RAG Builder",
    description="Human-in-the-loop RAG builder for legal documents.",
    version="0.1.0",
)

app.include_router(documents_router)
app.include_router(search_router)

# Expose Prometheus metrics at /metrics (default HTTP request metrics).
Instrumentator().instrument(app).expose(app)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "kakilleAI-admin"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=False)
