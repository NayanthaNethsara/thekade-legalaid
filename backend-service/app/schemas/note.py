from datetime import datetime

from pydantic import BaseModel, Field

_CONVERSATION_ID = Field(
    min_length=1,
    max_length=64,
    pattern=r"^[A-Za-z0-9_-]+$",
    description="Conversation the note belongs to; 'global' outside a conversation.",
)


class NoteResponse(BaseModel):
    """A workspace note as the Case Studio panel renders it."""

    id: str
    conversation_id: str
    content: str
    updated_at: datetime


class NoteCreateRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    content: str = Field(min_length=1, max_length=20_000)


class NoteUpdateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)
