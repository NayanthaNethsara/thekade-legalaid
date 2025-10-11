"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import logging

from app.database.database import get_db
from app.schemas.auth import (
    OTPRequest, 
    OTPVerification, 
    OTPResponse, 
    LoginResponse, 
    Token,
    UserResponse
)
from app.services.auth_service import AuthService, get_auth_service
from app.models.user import User
from app.core.auth_utils import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/request-otp", response_model=OTPResponse)
async def request_otp(
    otp_request: OTPRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Request OTP code to be sent via WhatsApp
    """
    try:
        result = await auth_service.send_otp(otp_request.mobile_number)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        return OTPResponse(
            message=result["message"],
            expires_in_minutes=result["expires_in_minutes"],
            mobile_number=otp_request.mobile_number
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP request failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP. Please try again later."
        )

@router.post("/verify-otp", response_model=LoginResponse)
async def verify_otp_and_login(
    otp_verification: OTPVerification,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verify OTP and login user
    """
    try:
        result = await auth_service.verify_otp_and_login(
            otp_verification.mobile_number,
            otp_verification.otp_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result["message"]
            )
        
        user_response = UserResponse(
            user_id=result["user"].user_id,
            mobile_number=result["user"].mobile_number,
            is_active=result["user"].is_active,
            created_at=result["user"].created_at
        )
        
        return LoginResponse(
            message=result["message"],
            user=user_response,
            token=result["token"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again later."
        )

@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh JWT access token
    """
    try:
        token = credentials.credentials
        new_token = auth_service.refresh_token(token)
        
        if new_token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return new_token
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )

# Dependency for getting current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """
    Dependency to get current authenticated user
    """
    try:
        token = credentials.credentials
        user = await auth_service.get_current_user(token)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    """
    return UserResponse(
        user_id=current_user.user_id,
        mobile_number=current_user.mobile_number,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Logout current user
    """
    try:
        success = await auth_service.logout_user(current_user.user_id)
        
        if success:
            return {"message": "Logged out successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Logout failed"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )