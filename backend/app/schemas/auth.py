"""
Authentication schemas for request/response models
"""

from pydantic import BaseModel, Field, validator
import re
from datetime import datetime
from typing import Optional

class OTPRequest(BaseModel):
    mobile_number: str = Field(..., description="Mobile number in international format")
    
    @validator('mobile_number')
    def validate_mobile_number(cls, v):
        # Remove any spaces, hyphens, or other non-numeric characters except +
        cleaned = re.sub(r'[^\d+]', '', v)
        
        # Check if it's a valid international format
        if not re.match(r'^\+\d{10,15}$', cleaned):
            raise ValueError('Mobile number must be in international format (e.g., +1234567890)')
        
        return cleaned

class OTPVerification(BaseModel):
    mobile_number: str = Field(..., description="Mobile number used for OTP request")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    
    @validator('mobile_number')
    def validate_mobile_number(cls, v):
        cleaned = re.sub(r'[^\d+]', '', v)
        if not re.match(r'^\+\d{10,15}$', cleaned):
            raise ValueError('Mobile number must be in international format')
        return cleaned
    
    @validator('otp_code')
    def validate_otp_code(cls, v):
        if not v.isdigit():
            raise ValueError('OTP code must contain only digits')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    mobile_number: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    mobile_number: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    token: Token

class OTPResponse(BaseModel):
    message: str
    expires_in_minutes: int
    mobile_number: str