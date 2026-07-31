import operator
from typing import Annotated, Any, Literal

from langgraph.graph import MessagesState


class AgentState(MessagesState):
    """Extends LangGraph's built-in message list with orchestrator context.

    ``channel`` tells ``generate_response`` which markup to write the reply in
    (web Markdown vs WhatsApp markup) and ``finalize_turn`` how to assemble the
    payload. ``memory`` is
    the customer's durable cross-conversation profile loaded from the Store (for
    WhatsApp users it also carries the number they message from);
    ``summary`` is the running condensation of this
    thread's older turns that the
    summarize node prunes from ``messages``. ``reason`` prepends both. ``title``
    is a short label derived once from the opening user message so the sidebar
    can list conversations without deserializing their history. The
    per-turn outputs ``respond`` returns are ``formatted_reply`` plus ``cards``
    (product cards) and ``actions`` (e.g. a pay link), populated for both
    channels; they are held as plain dicts so the checkpointer can serialize
    them.

    ``rendered_turns`` is the append-only transcript exactly as shown to the
    customer -- one entry per turn (user text, the final reply, its cards and
    actions). It is the source for conversation-history reads, so they return
    what was sent without reconstructing it from the raw execution messages.
    The ``operator.add`` reducer appends each turn's entry rather than replacing
    the list, surviving the checkpointer's persist-whole-state-per-turn model.
    """

    channel: Literal["web", "whatsapp"]
    formatted_reply: str
    title: str
    summary: str
    memory: str
    cart: str
    cards: list[dict[str, Any]]
    actions: list[dict[str, Any]]
    shown_product_ids: list[str]
    rendered_turns: Annotated[list[dict[str, Any]], operator.add]
    blocked: bool
    detected_language: str
    plan: str
    detected_emotion: str
    target_goal: str
    missing_fields: list[str]
    cart_checkouts: list[dict[str, Any]]
    tracking: list[dict[str, Any]]
    requires_memory_update: bool
    is_ui: bool
    _checkout_events: list[dict[str, Any]]
