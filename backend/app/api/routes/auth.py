import logging
from fastapi import APIRouter

from app.core.dependencies import AuthServiceDep
from app.schemas.user import UserCreate, UserRead, UserLogin

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserRead)
def register(user: UserCreate, auth_service: AuthServiceDep):
    """Register a new user."""
    logger.info(f"Registration request for email: {user.email}")
    created_user = auth_service.register_user(user.email, user.password)
    return UserRead(id=created_user.id, email=created_user.email)


@router.post("/login")
def login(user: UserLogin, auth_service: AuthServiceDep):
    """Authenticate user and return access token."""
    logger.info(f"Login request for email: {user.email}")
    return auth_service.login_user(user.email, user.password)
