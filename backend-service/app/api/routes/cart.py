from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import Principal, get_cart_repository, get_principal
from app.repositories.cart_repository import CartRepository
from app.schemas.cart import AddItemRequest, Cart, UpdateItemRequest

router = APIRouter(prefix="/cart", tags=["cart"])


def _cart_key(principal: Principal, conversation_id: str) -> str:
    """Scope the cart to one conversation of one principal.

    Mirrors the chat thread id so the cart the web UI mutates is the exact cart
    the agent reads and writes during that conversation.
    """
    return f"{principal.kind}:{principal.id}:{conversation_id}"


@router.get("", response_model=Cart)
async def get_cart(
    principal: Annotated[Principal, Depends(get_principal)],
    carts: Annotated[CartRepository, Depends(get_cart_repository)],
    conversation_id: Annotated[str, Query(min_length=1, max_length=64)],
) -> Cart:
    return await carts.get_cart(_cart_key(principal, conversation_id))


@router.post("/items", response_model=Cart)
async def add_item(
    payload: AddItemRequest,
    principal: Annotated[Principal, Depends(get_principal)],
    carts: Annotated[CartRepository, Depends(get_cart_repository)],
) -> Cart:
    return await carts.add_item(
        _cart_key(principal, payload.conversation_id), principal.kind, payload.item
    )


@router.put("/items", response_model=Cart)
async def update_item(
    payload: UpdateItemRequest,
    principal: Annotated[Principal, Depends(get_principal)],
    carts: Annotated[CartRepository, Depends(get_cart_repository)],
) -> Cart:
    cart_key = _cart_key(principal, payload.conversation_id)
    if payload.quantity == 0:
        return await carts.remove_item(cart_key, principal.kind, payload.product_id)
    return await carts.update_item(cart_key, principal.kind, payload.product_id, payload.quantity)


@router.delete("", response_model=Cart)
async def clear_cart(
    principal: Annotated[Principal, Depends(get_principal)],
    carts: Annotated[CartRepository, Depends(get_cart_repository)],
    conversation_id: Annotated[str, Query(min_length=1, max_length=64)],
) -> Cart:
    await carts.clear_cart(_cart_key(principal, conversation_id))
    return Cart()
