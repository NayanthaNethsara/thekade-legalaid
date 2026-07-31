import json
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.deps import (
    Principal,
    get_cart_repository,
    get_principal,
    require_internal_key,
)
from app.api.rate_limit import RateLimiterDep, enforce_rate_limit
from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.orchestrator import orchestrator
from app.repositories.cart_repository import CartRepository
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationDetail,
    ConversationSummary,
    ImageSearchResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


def _thread_id(principal: Principal, conversation_id: str) -> str:
    """Isolate each conversation as its own checkpointer thread.

    Every thread is ``kind:id:conversation_id``: scoped to the principal and
    uniquely identified, so conversations are always bound to their owner and
    individually addressable for listing and deletion.
    """
    return f"{principal.kind}:{principal.id}:{conversation_id}"


@router.post("", response_model=ChatResponse, dependencies=[Depends(require_internal_key)])
async def chat(
    payload: ChatRequest,
    principal: Annotated[Principal, Depends(get_principal)],
    limiter: RateLimiterDep,
    settings: Annotated[Settings, Depends(get_settings)],
    response: Response,
) -> ChatResponse:
    # Limit by the authenticated principal: each message drives an LLM call, so
    # this is the lever that bounds token spend per user/guest.
    await enforce_rate_limit(
        limiter,
        settings,
        "chat",
        f"{principal.kind}:{principal.id}",
        settings.rate_limit.chat_policy,
    )
    response.headers["Cache-Control"] = "no-store"
    thread_id = _thread_id(principal, payload.conversation_id)
    return await orchestrator.respond(
        payload.message,
        thread_id,
        channel="web",
        user_identity=principal.identity,
        principal_id=principal.id,
        principal_kind=principal.kind,
        is_ui=payload.is_ui,
    )


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/stream", dependencies=[Depends(require_internal_key)])
async def chat_stream(
    payload: ChatRequest,
    principal: Annotated[Principal, Depends(get_principal)],
    limiter: RateLimiterDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> StreamingResponse:
    """Stream a web turn as Server-Sent Events.

    Emits ``token``/``reset`` events as the reply generates, then a ``done`` event
    carrying the authoritative reply, cards, and actions (same shape as ``/chat``).
    """
    await enforce_rate_limit(
        limiter,
        settings,
        "chat",
        f"{principal.kind}:{principal.id}",
        settings.rate_limit.chat_policy,
    )
    thread_id = _thread_id(principal, payload.conversation_id)

    async def events() -> AsyncIterator[str]:
        async for event in orchestrator.respond_stream(
            payload.message,
            thread_id,
            channel="web",
            user_identity=principal.identity,
            principal_id=principal.id,
            principal_kind=principal.kind,
            is_ui=payload.is_ui,
        ):
            yield _sse(event)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "Connection": "keep-alive",
            # Disable proxy buffering so tokens reach the client as they are sent.
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/image-search",
    response_model=ImageSearchResponse,
    dependencies=[Depends(require_internal_key)],
)
async def image_search(
    principal: Annotated[Principal, Depends(get_principal)],
    limiter: RateLimiterDep,
    settings: Annotated[Settings, Depends(get_settings)],
    response: Response,
    file: Annotated[UploadFile, File()],
    caption: Annotated[str, Form()] = "",
    conversation_id: Annotated[str, Form()] = "",
) -> ImageSearchResponse:
    """KakilleVision: identify a product in an uploaded image for image search.

    Returns a search query the client then sends as a normal chat turn, or a
    friendly reason when the image is not something Kakille can look up. The image
    is used only for identification and is never stored.
    """
    # Each call drives a vision LLM request, so bound it like a chat turn.
    await enforce_rate_limit(
        limiter,
        settings,
        "chat",
        f"{principal.kind}:{principal.id}",
        settings.rate_limit.chat_policy,
    )
    response.headers["Cache-Control"] = "no-store"
    # Read one byte past the cap so an oversized upload is rejected without
    # buffering the whole body into memory.
    data = await file.read(settings.vision.max_image_bytes + 1)
    if len(data) > settings.vision.max_image_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is too large.",
        )
    thread_id = _thread_id(principal, conversation_id) if conversation_id else None
    identification = await orchestrator.identify_image(
        data, file.content_type or "", caption, thread_id=thread_id
    )
    return ImageSearchResponse(
        is_shoppable=identification.is_shoppable,
        query=identification.query,
        reason=identification.reason,
    )


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_internal_key)],
)
async def end_conversation(
    principal: Annotated[Principal, Depends(get_principal)],
    carts: Annotated[CartRepository, Depends(get_cart_repository)],
    conversation_id: str,
) -> None:
    """End a conversation and fully drop its stored history and cart.

    Returns 404 when the conversation does not exist for this principal, so the
    client only removes it from the UI once the backend confirms deletion.
    """
    thread_id = _thread_id(principal, conversation_id)
    # Cart shares the conversation's thread id as its key; drop it so no cart
    # outlives the conversation it belonged to.
    await carts.clear_cart(thread_id)
    deleted = await orchestrator.delete_conversation(thread_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


@router.get(
    "/conversations",
    response_model=list[ConversationSummary],
    dependencies=[Depends(require_internal_key)],
)
async def list_conversations(
    principal: Annotated[Principal, Depends(get_principal)],
) -> list[ConversationSummary]:
    """List the active principal's conversations as id + title only (sidebar)."""
    return await orchestrator.list_conversations(principal.kind, principal.id)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    dependencies=[Depends(require_internal_key)],
)
async def get_conversation(
    conversation_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
) -> ConversationDetail:
    """Load one conversation's full message history and running summary."""
    detail = await orchestrator.get_conversation_detail(_thread_id(principal, conversation_id))
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return detail
