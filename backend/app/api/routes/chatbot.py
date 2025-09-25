from fastapi import APIRouter, HTTPException
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.adapters.chat.mongo_history import MongoChatHistory
from app.adapters.llm.gemini_llm import GeminiLLM
from app.adapters.rag.faiss_retriever import FaissRetriever
from app.services.rag.qa_service import QAService
from app.services.rag.vectorstore import build_or_load_index
from app.core.config import settings
import traceback

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


qa = QAService(
    retriever=FaissRetriever(),
    llm=GeminiLLM(),
    history=MongoChatHistory(),
)

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        result = qa.answer(req.chat_id, req.query)
        return ChatResponse(
            chat_id=result["chat_id"],
            answer=result["answer"],
            retrieved_chunks=result.get("retrieved_chunks", []),
        )
    except Exception as e:
        # Print full traceback in console for debugging
        traceback.print_exc()
        # Return a detailed error message in response
        raise HTTPException(
            status_code=500,
            detail=f"Chatbot processing error: {str(e)}"
        )

#  Debug endpoint to view chunks
@router.get("/debug/chunks")
def debug_chunks(limit: int = 5):
    try:
        vs = build_or_load_index()
        docs = list(vs.docstore._dict.values())
        sample = [d.page_content[:500] for d in docs[:limit]]
        return {
            "total_chunks": len(docs),
            "sample": sample,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats")
def list_chats():
    ids = qa.history.list_ids()
    return {"chat_ids": ids, "count": len(ids)}

@router.delete("/chat/{chat_id}")
def clear_chat(chat_id: str):
    qa.history.reset(chat_id)
    return {"ok": True, "chat_id": chat_id, "message": "Chat cleared"}

@router.delete("/chats")
def clear_all_chats():
    qa.history.reset_all()
    return {"ok": True, "message": "All chats cleared"}
