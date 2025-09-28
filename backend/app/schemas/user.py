from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (minimum 8 characters)")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserRead(BaseModel):
    id: int = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email address")

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Updated email address")
    password: Optional[str] = Field(None, min_length=8, description="Updated password (minimum 8 characters)")
