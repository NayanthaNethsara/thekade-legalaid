from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.gemini_client import answer_question

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

class AskRequest(BaseModel):
    query: str

class AskResponse(BaseModel):
    answer: str

@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    try:
        return AskResponse(answer=answer_question(req.query))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
