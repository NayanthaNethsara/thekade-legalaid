from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import (
    get_current_user,
    get_customer_memory_repository,
    get_customer_profile_repository,
)
from app.models.user import User
from app.repositories.customer_memory_repository import CustomerMemoryRepository
from app.repositories.customer_profile_repository import (
    CustomerProfileData,
    CustomerProfileRepository,
)
from app.schemas.memory import CombinedExtraction
from app.schemas.profile import AddressSchema, ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


def _to_response(
    data: CustomerProfileData | None, memory_data: dict[str, Any] | None
) -> ProfileResponse:
    memory_text = None
    if memory_data:
        try:
            memory_text = CombinedExtraction(**memory_data).to_formatted_text()
        except Exception:
            pass

    if data is None:
        return ProfileResponse(name=None, phone=None, addresses=[], memory=memory_text)
    return ProfileResponse(
        name=data.name,
        phone=data.phone,
        addresses=[
            AddressSchema(
                label=a.get("label", "default"),
                value=a.get("value", ""),
                is_default=a.get("is_default", False),
            )
            for a in data.addresses
        ],
        memory=memory_text,
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user: Annotated[User, Depends(get_current_user)],
    profiles: Annotated[CustomerProfileRepository, Depends(get_customer_profile_repository)],
    memories: Annotated[CustomerMemoryRepository, Depends(get_customer_memory_repository)],
) -> ProfileResponse:
    return _to_response(await profiles.get(user.identity), await memories.get(user.identity))


@router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    profiles: Annotated[CustomerProfileRepository, Depends(get_customer_profile_repository)],
    memories: Annotated[CustomerMemoryRepository, Depends(get_customer_memory_repository)],
) -> ProfileResponse:
    data = CustomerProfileData(
        name=payload.name,
        phone=payload.phone,
        addresses=[
            {"label": a.label, "value": a.value, "is_default": a.is_default}
            for a in payload.addresses
        ],
    )
    await profiles.save(user.identity, data)
    return _to_response(data, await memories.get(user.identity))


@router.delete("/memory", status_code=status.HTTP_204_NO_CONTENT)
async def clear_memory(
    user: Annotated[User, Depends(get_current_user)],
    memories: Annotated[CustomerMemoryRepository, Depends(get_customer_memory_repository)],
) -> None:
    await memories.clear(user.identity)
