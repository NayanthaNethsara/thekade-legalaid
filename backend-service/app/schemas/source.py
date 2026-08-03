from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

_CONVERSATION_ID = Field(
    min_length=1,
    max_length=64,
    pattern=r"^[A-Za-z0-9_-]+$",
    description="Conversation the source belongs to; 'global' outside a conversation.",
)

SourceKind = Literal["file", "website", "youtube", "text"]


class SourceResponse(BaseModel):
    """A source row as the workspace panel renders it.

    Extracted text is intentionally omitted: the panel only lists sources, and
    content can be hundreds of kilobytes. The agent reads content server-side.
    """

    id: str
    conversation_id: str
    kind: SourceKind
    name: str
    size: int
    content_type: str
    url: str | None = None
    is_selected: bool
    added_at: datetime


class SourceLinkRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    url: str = Field(min_length=1, max_length=2048)


class SourceTextRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    name: str | None = Field(default=None, max_length=255)
    content: str = Field(min_length=1, max_length=200_000)


class SourceSelectRequest(BaseModel):
    is_selected: bool


class SourceSelectAllRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    is_selected: bool
