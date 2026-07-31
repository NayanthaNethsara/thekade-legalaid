from datetime import datetime

from pydantic import BaseModel, Field


class GuestRecord(BaseModel):
    """The server-side state of an anonymous visitor, stored in Redis with a TTL."""

    id: str
    display_name: str | None = None
    created_at: datetime


class CreateGuestRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=255)


class GuestResponse(BaseModel):
    id: str
    display_name: str | None = None


class GuestSessionResponse(BaseModel):
    guest_token: str
    guest: GuestResponse
    expires_in: int
