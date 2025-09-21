from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    chat_id: str = Field(..., description="Unique ID for the conversation")
    query: str = Field(..., description="User's question or message")

class ChatResponse(BaseModel):
    chat_id: str
    answer: str
    retrieved_chunks: Optional[List[str]] = Field(
        default=None, description="Relevant context chunks retrieved from FAISS"
    )
