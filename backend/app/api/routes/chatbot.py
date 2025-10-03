import logging
from fastapi import APIRouter

from app.schemas.chatbot import ChatRequest, ChatResponse
from app.adapters.chat.mongo_history import MongoChatHistory
from app.adapters.llm.gemini_llm import GeminiLLM
from app.adapters.rag.faiss_retriever import FaissRetriever
from app.services.rag.qa_service import QAService
from app.services.rag.vectorstore import build_or_load_index
from app.core.dependencies import QAServiceDep
from app.core.exceptions import ChatServiceError, RAGServiceError

logger = logging.getLogger(__name__)
router = APIRouter()

qa = QAService(
    retriever=FaissRetriever(),
    llm=GeminiLLM(),
    history=MongoChatHistory(),
)

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, qa_service: QAServiceDep):
    """Handle chat requests with the legal assistant."""
    try:
        logger.info(f"Processing chat request for chat_id: {req.chat_id}")
        result = qa_service.answer(req.chat_id, req.query)
        
        return ChatResponse(
            chat_id=result["chat_id"],
            answer=result["answer"],
            retrieved_chunks=result.get("retrieved_chunks", []),
        )
    except Exception as e:
        logger.error(f"Chat request failed for chat_id {req.chat_id}: {e}")
        raise ChatServiceError(f"Failed to process chat request: {str(e)}")

#  Debug endpoint to view chunks
@router.get("/debug/chunks")
def debug_chunks(limit: int = 5):
    """Debug endpoint to view document chunks."""
    try:
        vs = build_or_load_index()
        docs = list(vs.docstore._dict.values())
        sample = [d.page_content[:500] for d in docs[:limit]]
        return {
            "total_chunks": len(docs),
            "sample": sample,
        }
    except Exception as e:
        logger.error(f"Failed to retrieve debug chunks: {e}")
        raise RAGServiceError(f"Failed to retrieve chunks: {str(e)}")


@router.get("/chats")
def list_chats(qa_service: QAServiceDep):
    """List all chat IDs."""
    try:
        ids = qa_service.history.list_ids()
        return {"chat_ids": ids, "count": len(ids)}
    except Exception as e:
        logger.error(f"Failed to list chats: {e}")
        raise ChatServiceError(f"Failed to list chats: {str(e)}")


@router.delete("/chat/{chat_id}")
def clear_chat(chat_id: str, qa_service: QAServiceDep):
    """Clear a specific chat history."""
    try:
        qa_service.history.reset(chat_id)
        logger.info(f"Chat {chat_id} cleared successfully")
        return {"ok": True, "chat_id": chat_id, "message": "Chat cleared"}
    except Exception as e:
        logger.error(f"Failed to clear chat {chat_id}: {e}")
        raise ChatServiceError(f"Failed to clear chat: {str(e)}")


@router.delete("/chats")
def clear_all_chats(qa_service: QAServiceDep):
    """Clear all chat histories."""
    try:
        qa_service.history.reset_all()
        logger.info("All chats cleared successfully")
        return {"ok": True, "message": "All chats cleared"}
    except Exception as e:
        logger.error(f"Failed to clear all chats: {e}")
        raise ChatServiceError(f"Failed to clear chats: {str(e)}")
