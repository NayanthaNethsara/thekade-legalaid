from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.core.admin_auth import create_admin_token, require_admin_user
from app.core.config import get_settings

router = APIRouter(prefix="/api/v1/admin/auth", tags=["Admin Auth"])


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminAuthResponse(BaseModel):
    status: str
    username: str
    token: str


@router.post("/login", response_model=AdminAuthResponse)
async def admin_login(payload: AdminLoginRequest, response: Response) -> AdminAuthResponse:
    """Authenticate single-user admin and return token + session cookie."""
    settings = get_settings()

    is_valid_username = payload.username == settings.admin_auth.username
    is_valid_password = payload.password == settings.admin_auth.password

    if not (is_valid_username and is_valid_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin username or password.",
        )

    token = create_admin_token(payload.username)

    # Set secure HttpOnly cookie for web frontends
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )

    return AdminAuthResponse(status="success", username=payload.username, token=token)


@router.post("/logout")
async def admin_logout(response: Response) -> dict[str, str]:
    """Clear admin session cookie."""
    response.delete_cookie("admin_token")
    return {"status": "logged_out"}


@router.get("/me")
async def admin_me(username: Annotated[str, Depends(require_admin_user)]) -> dict[str, str]:
    """Verify active admin session state."""
    return {"username": username, "role": "admin"}
