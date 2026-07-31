import dataclasses
import re
from typing import Any

from langchain_core.messages import HumanMessage, RemoveMessage, ToolMessage

from app.orchestrator.constants import TITLE_MAX_CHARS
from app.orchestrator.state import AgentState
from app.orchestrator.utils.order_sync import extract_checkout_events
from app.orchestrator.utils.products import cards_from_ids, extract_actions
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import (
    current_turn_messages,
    current_turn_tool_messages,
    latest_user_text,
    message_text,
)


def _is_terminal_status(text: str) -> bool:
    """Check if the tracking status text indicates a terminal state (delivered/cancelled)."""
    lower_text = text.lower()
    if re.search(r"\bcancelled\b", lower_text):
        return True
    if re.search(r"\b(?<!un)delivered\b", lower_text):
        return True
    return False


def extract_tracking_details(messages: list[Any]) -> list[dict[str, Any]]:
    """Extract full tracking JSON payloads from kakille_track_order
    or track_all_active_orders tool outputs.
    """
    import json

    details = []
    turn_messages = current_turn_messages(messages)
    for msg in turn_messages:
        if isinstance(msg, ToolMessage) and msg.name in (
            "kakille_track_order",
            "track_all_active_orders",
        ):
            text = message_text(msg)

            # 1. Try parsing the whole text
            try:
                data = json.loads(text.strip())
                if isinstance(data, dict) and "order_number" in data:
                    details.append(data)
                    continue
            except Exception:
                pass

            # 2. Try parsing markdown code blocks
            for block in re.findall(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL):
                try:
                    data = json.loads(block.strip())
                    if isinstance(data, dict) and "order_number" in data:
                        details.append(data)
                except Exception:
                    pass

            # 3. Try finding any JSON object in text using brace matching
            start = 0
            while True:
                idx = text.find("{", start)
                if idx == -1:
                    break
                brace_count = 0
                end_idx = -1
                for i in range(idx, len(text)):
                    if text[i] == "{":
                        brace_count += 1
                    elif text[i] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i
                            break
                if end_idx != -1:
                    try:
                        candidate = text[idx : end_idx + 1]
                        data = json.loads(candidate)
                        if (
                            isinstance(data, dict)
                            and "order_number" in data
                            and data not in details
                        ):
                            details.append(data)
                    except Exception:
                        pass
                    start = end_idx + 1
                else:
                    start = idx + 1
    return details


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

    ``generate_response`` has already written the channel-appropriate reply
    text. This node attaches the structured product cards and actions parsed
    from this turn's tool output -- read from the tool data, never authored by
    the model, so IDs and prices stay exact -- records the turn in
    ``rendered_turns``, prunes the internal execution messages from history, and
    derives the conversation title once on the first turn.
    """
    node_start("FINALIZE TURN NODE")

    reply = _INTERNAL_ANNOTATION.sub("", message_text(state["messages"][-1])).strip()

    # Parse [DISPLAY: code1, code2] and strip it
    shown_product_ids = []
    display_match = re.search(r"\[DISPLAY:\s*(.+?)\]", reply)
    if display_match:
        codes_str = display_match.group(1)
        shown_product_ids = [code.strip() for code in codes_str.split(",") if code.strip()]
        reply = reply[: display_match.start()].strip() + " " + reply[display_match.end() :].strip()
        reply = reply.strip()

    if not reply:
        language = state.get("detected_language", "en")
        reply = _EMPTY_REPLY_FALLBACKS.get(language, _EMPTY_REPLY_FALLBACKS["en"])

    # generate_response already writes channel-appropriate markup; this is a
    # deterministic, idempotent backstop so any Markdown the model slips through
    # (** bold, ## headings, [label](url)) still renders right on WhatsApp.
    if state.get("channel") == "whatsapp":
        reply = _normalize_whatsapp_markup(reply)

    all_tool_messages = [m for m in state["messages"] if isinstance(m, ToolMessage)]
    cards = cards_from_ids(all_tool_messages, shown_product_ids)
    actions = extract_actions(current_turn_tool_messages(state["messages"]))

    checkouts = extract_checkout_events(state["messages"])
    tracking_details = extract_tracking_details(state["messages"])

    update: dict[str, Any] = {
        "formatted_reply": reply,
        "cards": cards,
        "actions": actions,
        "tracking": tracking_details,
        "_checkout_events": [dataclasses.asdict(c) for c in checkouts],
        "rendered_turns": [
            {
                "user": latest_user_text(state["messages"]),
                "reply": reply,
                "cards": cards,
                "actions": actions,
                "tracking": tracking_details,
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
        Cards=len(cards),
        Actions=len(actions),
    )
    return update


def _prune_internal_messages(messages: list[Any]) -> list[RemoveMessage]:
    """Remove this turn's tool calls/results and agent scratch from history.

    Everything between the last customer message and the final reply is internal
    execution detail. ``rendered_turns`` already preserves what the customer saw,
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
