import logging
from typing import Dict, Any

from app.repositories.user import UserRepository
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import ConflictError, AuthenticationError
from app.models.user import User

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def register_user(self, email: str, password: str) -> User:
        """Register a new user."""
        logger.info(f"Attempting to register user with email: {email}")
        
        # Check if user already exists
        existing_user = self.user_repo.get_by_email(email)
        if existing_user:
            logger.warning(f"Registration failed: Email {email} already exists")
            raise ConflictError("Email already registered")
        
        # Create user
        try:
            hashed_password = hash_password(password)
            user = self.user_repo.create(email, hashed_password)
            logger.info(f"User registered successfully: {email}")
            return user
        except Exception as e:
            logger.error(f"Failed to register user {email}: {e}")
            raise

    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return access token."""
        logger.info(f"Attempting login for user: {email}")
        
        # Get user
        user = self.user_repo.get_by_email(email)
        if not user:
            logger.warning(f"Login failed: User {email} not found")
            raise AuthenticationError("Invalid credentials")
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            logger.warning(f"Login failed: Invalid password for user {email}")
            raise AuthenticationError("Invalid credentials")
        
        # Create token
        try:
            token = create_access_token({"sub": str(user.id)})
            logger.info(f"User logged in successfully: {email}")
            return {
                "access_token": token,
                "token_type": "bearer",
                "user_id": user.id,
                "email": user.email,
            }
        except Exception as e:
            logger.error(f"Failed to create token for user {email}: {e}")
            raise
