import re
from typing import Any

from langchain_core.messages import HumanMessage, RemoveMessage

from app.orchestrator.constants import TITLE_MAX_CHARS
from app.orchestrator.state import AgentState
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import (
    current_turn_messages,
    latest_user_text,
    message_text,
)

_MD_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")
_HEADING = re.compile(r"^#{1,6}\s*(.+?)\s*$", re.MULTILINE)

# Internal context markers earlier versions appended to the stored reply. The
# model is no longer fed them back, so it should not emit them; strip any stray
# occurrence (and everything after) as a backstop so they never reach the user.
_INTERNAL_ANNOTATION = re.compile(
    r"\s*\[(?:Products shown to user|Actions taken):\].*",
    re.DOTALL,
)

# Last-resort reply when the turn ends without text (e.g. the reactive tool
# loop hit its round budget on a dangling tool call).
_EMPTY_REPLY_FALLBACKS = {
    "en": "Sorry, I lost my train of thought there. Could you say that again?",
    "si": "සමාවෙන්න, මට පොඩ්ඩක් පැටලුණා. ආයෙ එක පාරක් කියන්න පුළුවන්ද?",
    "ta": "மன்னிக்கவும், கொஞ்சம் குழப்பமாகிவிட்டது. மீண்டும் ஒருமுறை சொல்ல முடியுமா?",
    "singlish": "Sorry, mata podi pateluna. Aye eka parak kiyanna puluwanda?",
    "tanglish": "Sorry, konjam confuse aagiduchu. Innoru thadava sollunga?",
}


async def finalize_turn(state: AgentState) -> dict[str, Any]:
    """Assemble the channel payload and trim the turn's internal messages.

    The agent has already written the channel-appropriate reply text. This node
    cleans it up, records the turn in ``rendered_turns``, prunes the internal
    execution messages from history, and derives the conversation title once on
    the first turn. ``cards`` and ``actions`` stay in the payload as empty lists
    so the wire shape the clients render is unchanged.
    """
    node_start("FINALIZE TURN NODE")

    reply = _INTERNAL_ANNOTATION.sub("", message_text(state["messages"][-1])).strip()

    if not reply:
        language = state.get("detected_language", "en")
        reply = _EMPTY_REPLY_FALLBACKS.get(language, _EMPTY_REPLY_FALLBACKS["en"])

    # The agents already write channel-appropriate markup; this is a
    # deterministic, idempotent backstop so any Markdown the model slips through
    # (** bold, ## headings, [label](url)) still renders right on WhatsApp.
    if state.get("channel") == "whatsapp":
        reply = _normalize_whatsapp_markup(reply)

    update: dict[str, Any] = {
        "formatted_reply": reply,
        "cards": [],
        "actions": [],
        "rendered_turns": [
            {
                "user": latest_user_text(state["messages"]),
                "reply": reply,
                "cards": [],
                "actions": [],
            }
        ],
    }

    removals = _prune_internal_messages(state["messages"])
    if removals:
        update["messages"] = removals

    if not state.get("title"):
        update["title"] = _derive_title(state["messages"])

    node_finish(
        "FINALIZE TURN NODE",
        Reply=reply[:60],
    )
    return update


def _prune_internal_messages(messages: list[Any]) -> list[RemoveMessage]:
    """Remove this turn's tool calls/results and agent scratch from history.

    Everything between the last user message and the final reply is internal
    execution detail. ``rendered_turns`` already preserves what the user saw,
    so dropping it keeps the checkpointed thread small and free of tool noise.
    """
    internal = current_turn_messages(messages)[:-1]
    return [RemoveMessage(id=msg.id) for msg in internal if msg.id is not None]


def _normalize_whatsapp_markup(text: str) -> str:
    """Rewrite any leftover Markdown into WhatsApp markup. Idempotent.

    WhatsApp has no '#' headings, '[label](url)' links, or inline-code markup,
    and uses single asterisks for bold. Text already in WhatsApp markup passes
    through unchanged, so this is safe to run on every WhatsApp reply.
    """
    text = _MD_LINK.sub(r"\1: \2", text)  # [label](url) -> label: url
    text = _HEADING.sub(r"*\1*", text)  # ## Heading -> *Heading*
    text = text.replace("**", "*")  # markdown bold -> WhatsApp bold
    text = text.replace("`", "")  # WhatsApp has no inline-code markup
    return text.strip()


def _derive_title(messages: list[Any]) -> str:
    """Label the conversation by its opening user message, truncated.

    Set once on the first turn and persisted in state so the sidebar list can
    read it without deserializing the thread's messages.
    """
    for message in messages:
        if isinstance(message, HumanMessage):
            text = message_text(message).strip()
            if text:
                return text[:TITLE_MAX_CHARS]
    return "New chat"
