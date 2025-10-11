"""
Authentication repository for database operations
"""

from datetime import datetime, timedelta
from typing import Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, delete

from app.models.user import User, OTPCode
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthRepository:
    """Repository class for authentication-related database operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def save_otp_code(self, mobile_number: str, otp_code: str) -> bool:
        """
        Save OTP code to database with expiration time
        
        Args:
            mobile_number: User's mobile number
            otp_code: Generated OTP code
            
        Returns:
            bool: True if saved successfully, False otherwise
        """
        try:
            # Delete any existing OTP codes for this mobile number
            delete_stmt = delete(OTPCode).where(OTPCode.mobile_number == mobile_number)
            await self.db.execute(delete_stmt)
            
            # Create new OTP code
            expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
            
            otp_record = OTPCode(
                mobile_number=mobile_number,
                otp_code=otp_code,
                expires_at=expires_at,
                is_used=False
            )
            
            self.db.add(otp_record)
            await self.db.commit()
            
            logger.info(f"OTP code saved for mobile number: {mobile_number}")
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to save OTP code: {e}")
            await self.db.rollback()
            return False
    
    async def verify_otp_code(self, mobile_number: str, otp_code: str) -> bool:
        """
        Verify OTP code for mobile number
        
        Args:
            mobile_number: User's mobile number
            otp_code: OTP code to verify
            
        Returns:
            bool: True if valid and not expired, False otherwise
        """
        try:
            # Find the OTP record
            stmt = select(OTPCode).where(
                OTPCode.mobile_number == mobile_number,
                OTPCode.otp_code == otp_code,
                OTPCode.is_used == False,
                OTPCode.expires_at > datetime.utcnow()
            )
            result = await self.db.execute(stmt)
            otp_record = result.scalar_one_or_none()
            
            if otp_record:
                # Mark OTP as used
                otp_record.is_used = True
                await self.db.commit()
                
                logger.info(f"OTP verified successfully for mobile number: {mobile_number}")
                return True
            else:
                logger.warning(f"Invalid or expired OTP for mobile number: {mobile_number}")
                return False
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to verify OTP code: {e}")
            await self.db.rollback()
            return False
    
    async def get_or_create_user(self, mobile_number: str) -> Optional[User]:
        """
        Get existing user or create new user
        
        Args:
            mobile_number: User's mobile number
            
        Returns:
            User: User object if successful, None otherwise
        """
        try:
            # Try to find existing user
            stmt = select(User).where(User.mobile_number == mobile_number)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user:
                logger.info(f"Found existing user: {user.user_id}")
                return user
            
            # Create new user
            # Generate unique user_id (you might want to use UUID or other method)
            import uuid
            user_id = str(uuid.uuid4())
            
            new_user = User(
                user_id=user_id,
                mobile_number=mobile_number,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            self.db.add(new_user)
            await self.db.commit()
            await self.db.refresh(new_user)
            
            logger.info(f"Created new user: {new_user.user_id}")
            return new_user
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to get or create user: {e}")
            await self.db.rollback()
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Get user by user ID
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            User: User object if found, None otherwise
        """
        try:
            stmt = select(User).where(
                User.user_id == user_id,
                User.is_active == True
            )
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user:
                logger.info(f"Found user by ID: {user_id}")
            else:
                logger.warning(f"User not found by ID: {user_id}")
                
            return user
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to get user by ID: {e}")
            return None
    
    async def cleanup_expired_otps(self) -> int:
        """
        Clean up expired OTP codes from database
        
        Returns:
            int: Number of expired OTPs removed
        """
        try:
            delete_stmt = delete(OTPCode).where(OTPCode.expires_at <= datetime.utcnow())
            result = await self.db.execute(delete_stmt)
            deleted_count = result.rowcount
            
            await self.db.commit()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired OTP codes")
                
            return deleted_count
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to cleanup expired OTPs: {e}")
            await self.db.rollback()
            return 0