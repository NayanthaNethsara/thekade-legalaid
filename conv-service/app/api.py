"""
FastAPI REST API for RAG queries.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from app.services.rag_service import RAGService
from app.core.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="LegalAid RAG API",
    description="Retrieval-Augmented Generation API for Sri Lankan Legal Questions",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG service
rag_service = RAGService()
logger.info("RAG API initialized")


# Request/Response models
class QueryRequest(BaseModel):
    """RAG query request."""
    question: str = Field(..., description="User's legal question", min_length=1)
    top_k: Optional[int] = Field(None, description="Number of document chunks to retrieve (default: 5)", ge=1, le=20)
    chat_history: Optional[List[Dict[str, str]]] = Field(None, description="Optional chat history for context")


class Citation(BaseModel):
    """Citation information."""
    source_number: int
    document_id: int
    chunk_id: int
    chunk_index: int
    filename: str
    file_type: str
    distance: float
    excerpt: str


class QueryResponse(BaseModel):
    """RAG query response."""
    answer: str
    citations: List[Citation]
    metadata: Dict[str, Any]


class StatsResponse(BaseModel):
    """RAG system statistics."""
    total_documents: int
    total_chunks: int
    embedding_model: str
    vector_dim: int
    default_top_k: int


# API endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "LegalAid RAG API",
        "version": "1.0.0"
    }


@app.get("/api/v1/rag/health")
async def health_check():
    """Health check endpoint for RAG service."""
    return {
        "status": "ok",
        "service": "LegalAid RAG API",
        "version": "1.0.0",
        "model": settings.GEMINI_EMBEDDING_MODEL
    }


@app.post("/api/v1/rag/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """
    Query the RAG system with a legal question.
    
    Returns an answer with citations from indexed legal documents.
    """
    try:
        logger.info(f"Received RAG query: {request.question[:100]}...")
        
        result = rag_service.query(
            question=request.question,
            top_k=request.top_k,
            chat_history=request.chat_history
        )
        
        return QueryResponse(**result)
        
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/rag/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get RAG system statistics.
    
    Returns information about indexed documents and system configuration.
    """
    try:
        stats = rag_service.get_stats()
        return StatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
