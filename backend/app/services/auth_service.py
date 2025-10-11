"""
Authentication service for OTP generation, verification, and JWT handling
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.config import settings
from app.repositories.auth_repo import AuthRepository
from app.database.database import get_db
from app.models.user import User
from app.services.whatsapp_service import WhatsAppService
from app.schemas.auth import Token, TokenData

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_repo = AuthRepository(db)
        self.whatsapp_service = WhatsAppService()
    
    def generate_otp(self) -> str:
        """Generate a random OTP code"""
        return ''.join(random.choices(string.digits, k=settings.OTP_LENGTH))
    
    async def send_otp(self, mobile_number: str) -> Dict[str, Any]:
        """Generate and send OTP via WhatsApp"""
        try:
            # Generate OTP
            otp_code = self.generate_otp()

            print(otp_code)
            
            # Save OTP to database
            await self.auth_repo.save_otp_code(mobile_number, otp_code)
            
            # Send OTP via WhatsApp
            message = f"""🔐 *Legal Aid Login Code*

Your verification code is: *{otp_code}*

This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.

If you didn't request this code, please ignore this message.

🔒 Keep this code secure and don't share it with anyone."""

            await self.whatsapp_service.send_text(mobile_number, message)
            
            logger.info(f"OTP sent successfully to {mobile_number}")
            
            return {
                "success": True,
                "message": "OTP sent successfully",
                "expires_in_minutes": settings.OTP_EXPIRE_MINUTES
            }
            
        except Exception as e:
            logger.error(f"Failed to send OTP to {mobile_number}: {e}")
            return {
                "success": False,
                "message": "Failed to send OTP. Please try again.",
                "error": str(e)
            }
    
    async def verify_otp_and_login(self, mobile_number: str, otp_code: str) -> Dict[str, Any]:
        """Verify OTP and generate JWT token"""
        try:
            # Verify OTP
            is_valid = await self.auth_repo.verify_otp_code(mobile_number, otp_code)
            
            if not is_valid:
                return {
                    "success": False,
                    "message": "Invalid or expired OTP code"
                }
            
            # Get or create user
            user = await self.auth_repo.get_or_create_user(mobile_number)
            
            if not user.is_active:
                return {
                    "success": False,
                    "message": "Account is deactivated. Please contact support."
                }
            
            # Generate JWT token
            token = self.create_access_token(user)
            
            logger.info(f"User {user.user_id} logged in successfully")
            
            return {
                "success": True,
                "message": "Login successful",
                "user": user,
                "token": token
            }
            
        except Exception as e:
            logger.error(f"Login verification failed for {mobile_number}: {e}")
            return {
                "success": False,
                "message": "Login failed. Please try again.",
                "error": str(e)
            }
    
    def create_access_token(self, user: User) -> Token:
        """Create JWT access token for user"""
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        expire = datetime.utcnow() + expires_delta
        
        to_encode = {
            "sub": user.user_id,
            "mobile_number": user.mobile_number,
            "exp": expire,
            "iat": datetime.utcnow()
        }
        
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.JWT_SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        
        return Token(
            access_token=encoded_jwt,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
            user_id=user.user_id
        )
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            user_id: str = payload.get("sub")
            mobile_number: str = payload.get("mobile_number")
            
            if user_id is None:
                return None
            
            return TokenData(user_id=user_id, mobile_number=mobile_number)
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
    
    async def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from JWT token"""
        try:
            token_data = self.verify_token(token)
            
            if token_data is None or token_data.user_id is None:
                return None
            
            user = await self.auth_repo.get_user_by_id(token_data.user_id)
            
            if user is None or not user.is_active:
                return None
            
            return user
            
        except Exception as e:
            logger.error(f"Failed to get current user: {e}")
            return None
    
    def refresh_token(self, token: str) -> Optional[Token]:
        """Refresh JWT token if valid"""
        try:
            user = self.get_current_user(token)
            
            if user is None:
                return None
            
            return self.create_access_token(user)
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None
    
    async def logout_user(self, user_id: str) -> bool:
        """Logout user (in this simple implementation, just validate user exists)"""
        try:
            user = await self.auth_repo.get_user_by_id(user_id)
            if user:
                logger.info(f"User {user_id} logged out")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Logout failed for user {user_id}: {e}")
            return False

# Utility functions for FastAPI dependency injection
def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency injection for AuthService"""
    return AuthService(db)