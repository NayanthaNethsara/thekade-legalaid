from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str = Field(
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9_-]+$",
        description="Client-supplied conversation id; every conversation owns one isolated thread.",
    )
    is_ui: bool = Field(
        default=False,
        description="True if this message is triggered programmatically by the client UI.",
    )
    source_ids: list[str] = Field(
        default_factory=list,
        max_length=300,
        description="Ids of the workspace sources the user has selected for this turn.",
    )


class QuickMessageItem(BaseModel):
    """A starter prompt chip shown on the web landing page."""

    icon_name: str
    label: str
    message: str


class ImageSearchResponse(BaseModel):
    """KakilleVision verdict for an uploaded image (POST /chat/image-search).

    ``is_shoppable`` is true when the image maps to an item Kakille can look up;
    ``query`` is then the search phrase the client sends as a normal chat turn.
    When false, ``reason`` is a short, customer-friendly explanation to show
    instead. The image itself is never stored.
    """

    is_shoppable: bool
    query: str = ""
    reason: str = ""


class ProductCard(BaseModel):
    """A product surfaced from a tool result, for the web client to render."""

    code: str
    name: str
    price: str | None = None
    stock: str | None = None
    image_url: str | None = None
    url: str | None = None


class Action(BaseModel):
    """A call-to-action surfaced alongside the reply (e.g. a click-to-pay link)."""

    kind: Literal["pay", "track"]
    label: str
    url: str


class ChatResponse(BaseModel):
    """Channel-neutral reply envelope.

    ``reply`` is the text every channel uses. ``cards`` and ``actions`` are the
    structured-attachment channel: the web client renders them directly and the
    WhatsApp handler converts them into interactive messages. Nothing populates
    them today, but the shape is kept so both clients stay stable.
    """

    reply: str
    cards: list[ProductCard] = Field(default_factory=list)
    actions: list[Action] = Field(default_factory=list)
    detected_emotion: str | None = None
    target_goal: str | None = None
    title: str | None = None


class MessageResponse(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    # Cards and actions shown with this assistant turn, taken from the rendered
    # transcript so reopening a conversation shows what was first sent.
    cards: list[ProductCard] = Field(default_factory=list)
    actions: list[Action] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    """A sidebar list entry: identity and label only, no message history."""

    id: str
    title: str


class ConversationDetail(BaseModel):
    """One conversation's full history, fetched when the user opens it.

    ``summary`` is the running condensation of older turns the orchestrator
    folded out of the live window; the client may show it as earlier context.
    """

    id: str
    title: str
    summary: str
    messages: list[MessageResponse]
