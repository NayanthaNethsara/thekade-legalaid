from datetime import date

from pydantic import BaseModel, Field

_CONVERSATION_ID = Field(
    min_length=1,
    max_length=64,
    pattern=r"^[A-Za-z0-9_-]+$",
    description="Conversation the reminder belongs to; 'global' outside a conversation.",
)


class ReminderResponse(BaseModel):
    """A workspace reminder as the Case Studio panel renders it."""

    id: str
    conversation_id: str
    title: str
    due_date: date | None = None
    is_done: bool


class ReminderCreateRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    title: str = Field(min_length=1, max_length=500)
    due_date: date | None = None


class ReminderUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    due_date: date | None = None
    is_done: bool | None = None
