from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_auth_service, get_current_user
from app.api.rate_limit import rate_limit_by_ip
from app.models.user import User
from app.schemas.auth import (
    GoogleSignInRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService, TokenPair
from app.services.errors import InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["auth"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def _to_token_response(tokens: TokenPair) -> TokenResponse:
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
    )


@router.post(
    "/google",
    response_model=TokenResponse,
    dependencies=[rate_limit_by_ip("auth:google", lambda limits: limits.auth_policy)],
)
async def google_sign_in(payload: GoogleSignInRequest, service: AuthServiceDep) -> TokenResponse:
    try:
        tokens = await service.sign_in_with_google(payload.id_token)
    except InvalidCredentialsError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google sign-in") from error
    return _to_token_response(tokens)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, service: AuthServiceDep) -> TokenResponse:
    try:
        tokens = await service.refresh(payload.refresh_token)
    except InvalidCredentialsError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from error
    return _to_token_response(tokens)


@router.get("/me", response_model=UserResponse)
async def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
