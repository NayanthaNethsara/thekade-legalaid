from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_guest, get_guest_service
from app.api.rate_limit import rate_limit_by_ip
from app.schemas.guest import (
    CreateGuestRequest,
    GuestRecord,
    GuestResponse,
    GuestSessionResponse,
)
from app.services.guest_service import GuestService

router = APIRouter(prefix="/guest", tags=["guest"])

GuestServiceDep = Annotated[GuestService, Depends(get_guest_service)]


# The internal-key check lives on the router include in main.py, shared with
# every other business route.
@router.post(
    "",
    response_model=GuestSessionResponse,
    dependencies=[rate_limit_by_ip("guest:create", lambda limits: limits.guest_create_policy)],
)
async def create_guest(
    payload: CreateGuestRequest, service: GuestServiceDep
) -> GuestSessionResponse:
    return await service.create_guest(payload.display_name)


@router.get("/me", response_model=GuestResponse)
async def me(guest: Annotated[GuestRecord, Depends(get_current_guest)]) -> GuestResponse:
    return GuestResponse(id=guest.id, display_name=guest.display_name)
