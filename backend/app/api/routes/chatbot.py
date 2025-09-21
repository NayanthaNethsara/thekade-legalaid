from fastapi import APIRouter, HTTPException
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.adapters.chat.inmem_history import InMemChatHistory
from app.adapters.llm.gemini_llm import GeminiLLM
from app.adapters.rag.faiss_retriever import FaissRetriever
from app.services.rag.qa_service import QAService
from app.services.rag.vectorstore import build_or_load_index
from app.core.config import settings

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

qa = QAService(
    retriever=FaissRetriever(),
    llm=GeminiLLM(),
    history=InMemChatHistory(),
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
        raise HTTPException(status_code=500, detail=str(e))

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
