# app/core/app_factory.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import uuid

from app.api.routes import auth, chatbot, health
from app.core.config import settings
from app.core.exceptions import BaseAPIException
from app.core.logging import setup_logging
from app.services.rag.vectorstore import build_or_load_index


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting up LegalAid API...")
    setup_logging()
    
    # Initialize RAG index
    try:
        build_or_load_index()
        logger.info("RAG index initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG index: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down LegalAid API...")


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="LegalAid API",
        description="AI-powered Legal Assistant API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )
    
    # Add middleware
    configure_middleware(app)
    
    # Add exception handlers
    configure_exception_handlers(app)
    
    # Include routers
    configure_routes(app)
    
    return app


def configure_middleware(app: FastAPI) -> None:
    """Configure application middleware."""
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # Frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
    )
    
    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Log request
        logger.info(
            f"Request {request_id}: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
            }
        )
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.info(
            f"Response {request_id}: {response.status_code} - {process_time:.3f}s",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "process_time": process_time,
            }
        )
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


def configure_exception_handlers(app: FastAPI) -> None:
    """Configure global exception handlers."""
    
    @app.exception_handler(BaseAPIException)
    async def api_exception_handler(request: Request, exc: BaseAPIException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": exc.__class__.__name__,
                    "message": exc.detail,
                    "status_code": exc.status_code,
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "type": "InternalServerError",
                    "message": "An unexpected error occurred",
                    "status_code": 500,
                }
            }
        )


def configure_routes(app: FastAPI) -> None:
    """Configure application routes."""
    app.include_router(health.router, prefix="/health", tags=["Health"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["Chatbot"])