import uuid

from pydantic import BaseModel, ConfigDict, Field


class GoogleSignInRequest(BaseModel):
    """Firebase ID token obtained on the frontend via Google sign-in."""

    id_token: str = Field(min_length=1, max_length=4096)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str | None
    email: str | None
    display_name: str | None
    source: str
