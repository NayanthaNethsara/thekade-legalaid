"""Admin service — FastAPI app for RAG training, ingestion, and querying.

This service uses a layered architecture:
- ``api/routers``: FastAPI HTTP endpoints
- ``services``: Business logic (ingestion, parsing, chunking, embedding)
- ``repositories``: Database operations
- ``models``: SQLAlchemy schemas
- ``core``: Configuration and DB setup
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import training, documents, system, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(
    title="LegalAid Admin Service",
    description="RAG training and document ingestion for the LegalAid knowledge base.",
    version="1.0.0",
)

# Add CORS so the dashboard can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(system.router)
app.include_router(training.router)
app.include_router(documents.router)
app.include_router(users.router)

# Serve the frontend Dashboard
app.mount("/", StaticFiles(directory="static", html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
