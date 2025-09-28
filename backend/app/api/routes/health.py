# app/api/routes/health.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from typing import Dict

from app.core.dependencies import DatabaseSession
from app.core.config import settings


router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    services: Dict[str, str]


@router.get("/", response_model=HealthResponse)
async def health_check(db: DatabaseSession):
    """Basic health check endpoint."""
    
    # Check database connection
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check RAG service
    try:
        from app.services.rag.vectorstore import build_or_load_index
        build_or_load_index()
        rag_status = "healthy"
    except Exception as e:
        rag_status = f"unhealthy: {str(e)}"
    
    return HealthResponse(
        status="healthy" if db_status == "healthy" and rag_status == "healthy" else "degraded",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        services={
            "database": db_status,
            "rag": rag_status,
        }
    )


@router.get("/ready")
async def readiness_check(db: DatabaseSession):
    """Readiness check for container orchestration."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503


@router.get("/live")
async def liveness_check():
    """Liveness check for container orchestration."""
    return {"status": "alive"}