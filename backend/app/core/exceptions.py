# app/core/exceptions.py
from typing import Any, Dict, Optional
from fastapi import HTTPException


class BaseAPIException(HTTPException):
    """Base exception class for API errors."""
    
    def __init__(
        self, 
        status_code: int = 500, 
        detail: str = "Internal Server Error",
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class AuthenticationError(BaseAPIException):
    """Authentication related errors."""
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)


class AuthorizationError(BaseAPIException):
    """Authorization related errors."""
    
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail)


class ValidationError(BaseAPIException):
    """Validation related errors."""
    
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=422, detail=detail)


class NotFoundError(BaseAPIException):
    """Resource not found errors."""
    
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)


class ConflictError(BaseAPIException):
    """Resource conflict errors."""
    
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=409, detail=detail)


class ServiceUnavailableError(BaseAPIException):
    """Service unavailable errors."""
    
    def __init__(self, detail: str = "Service temporarily unavailable"):
        super().__init__(status_code=503, detail=detail)


class ChatServiceError(BaseAPIException):
    """Chat service specific errors."""
    
    def __init__(self, detail: str = "Chat service error"):
        super().__init__(status_code=500, detail=detail)


class LLMServiceError(BaseAPIException):
    """LLM service specific errors."""
    
    def __init__(self, detail: str = "LLM service error"):
        super().__init__(status_code=502, detail=detail)


class RAGServiceError(BaseAPIException):
    """RAG service specific errors."""
    
    def __init__(self, detail: str = "RAG service error"):
        super().__init__(status_code=502, detail=detail)