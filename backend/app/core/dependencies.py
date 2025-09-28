# app/core/dependencies.py
from functools import lru_cache
from typing import Annotated, Generator
from fastapi import Depends
from sqlalchemy.orm import Session

from app.adapters.chat.inmem_history import InMemChatHistory
from app.adapters.llm.gemini_llm import GeminiLLM
from app.adapters.rag.faiss_retriever import FaissRetriever
from app.db.postgres import SessionLocal
from app.repositories.user import UserRepository
from app.services.auth_service import AuthService
from app.services.rag.qa_service import QAService


def get_db_session() -> Generator[Session, None, None]:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@lru_cache()
def get_chat_history():
    """Get chat history service - cached singleton."""
    return InMemChatHistory()


@lru_cache()
def get_llm_service():
    """Get LLM service - cached singleton."""
    return GeminiLLM()


@lru_cache()
def get_retriever_service():
    """Get retriever service - cached singleton."""
    return FaissRetriever()


@lru_cache()
def get_qa_service():
    """Get QA service - cached singleton."""
    return QAService(
        retriever=get_retriever_service(),
        llm=get_llm_service(),
        history=get_chat_history(),
    )


def get_user_repository(db: Annotated[Session, Depends(get_db_session)]):
    """Get user repository with database session."""
    return UserRepository(db)


def get_auth_service(user_repo: Annotated[UserRepository, Depends(get_user_repository)]):
    """Get authentication service with user repository."""
    return AuthService(user_repo)


# Type aliases for cleaner dependency injection
DatabaseSession = Annotated[Session, Depends(get_db_session)]
QAServiceDep = Annotated[QAService, Depends(get_qa_service)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]