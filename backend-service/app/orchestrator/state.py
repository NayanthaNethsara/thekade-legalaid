import operator
from typing import Annotated, Any, Literal

from langgraph.graph import MessagesState


class AgentState(MessagesState):
    """Extends LangGraph's built-in message list with orchestrator context.

    ``channel`` tells the agents which markup to write the reply in (web
    Markdown vs WhatsApp markup) and ``finalize_turn`` how to assemble the
    payload. ``memory`` is the customer's durable cross-conversation profile
    loaded from the Store; ``summary`` is the running condensation of this
    thread's older turns that the summarize node prunes from ``messages``.
    ``sources_context`` carries the user's selected workspace sources for the
    turn. ``title`` is a short label derived once from the opening user message
    so the sidebar can list conversations without deserializing their history.
    ``cards`` and ``actions`` are kept (always empty today) so the rendered-turn
    and wire shapes stay stable for the web and WhatsApp clients.

    ``rendered_turns`` is the append-only transcript exactly as shown to the
    customer -- one entry per turn. It is the source for conversation-history
    reads, so they return what was sent without reconstructing it from the raw
    execution messages. The ``operator.add`` reducer appends each turn's entry
    rather than replacing the list, surviving the checkpointer's
    persist-whole-state-per-turn model.
    """

    channel: Literal["web", "whatsapp"]
    formatted_reply: str
    title: str
    summary: str
    memory: str
    sources_context: str
    cards: list[dict[str, Any]]
    actions: list[dict[str, Any]]
    rendered_turns: Annotated[list[dict[str, Any]], operator.add]
    blocked: bool
    detected_language: str
    plan: str
    detected_emotion: str
    target_goal: str
    requires_memory_update: bool
    is_ui: bool
