"""Prompt refiner node — contextualises the raw user message.

Detects follow-up replies (e.g. "yes", "no", "3pm") using the saved
``pending_follow_up`` context and resolves them into full intents.
Preserves all parts of multi-part requests.
"""

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts import REFINER_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def _format_history(recent_messages: list[dict]) -> str:
    """Format cached conversation turns into a readable block."""
    if not recent_messages:
        return "(no prior conversation)"
    lines: list[str] = []
    for msg in recent_messages[-6:]:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


async def prompt_refiner_node(state: AgentState) -> dict:
    """Refine the latest user message into a clear, contextualised prompt."""

    # Extract latest user text.
    user_text = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            user_text = msg.content if isinstance(msg.content, str) else str(msg.content)
            break

    if not user_text:
        return {"refined_prompt": ""}

    history_block = _format_history(state.get("recent_messages", []))

    # Include pending follow-up context if available.
    follow_up = state.get("pending_follow_up")
    follow_up_block = ""
    if follow_up:
        question = follow_up.get("question", "")
        context = follow_up.get("context", "")
        follow_up_block = (
            f"## Pending Follow-Up\n"
            f"The assistant previously asked: \"{question}\"\n"
            f"Context: {context}"
        )

    try:
        model = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
        )

        parts = [f"## Conversation History\n{history_block}"]
        if follow_up_block:
            parts.append(follow_up_block)
        parts.append(f"## Latest Message\n{user_text}")

        response = await model.ainvoke(
            [
                {"role": "system", "content": REFINER_SYSTEM_PROMPT},
                {"role": "user", "content": "\n\n".join(parts)},
            ]
        )

        refined = response.content.strip()
        logger.info(
            f"[{state.get('user_phone')}] prompt_refiner: "
            f"'{user_text[:60]}' → '{refined[:80]}'"
        )
        return {"refined_prompt": refined}

    except Exception as exc:
        logger.error(
            f"[{state.get('user_phone')}] prompt_refiner error: {exc} — "
            "falling back to raw user text"
        )
        return {"refined_prompt": user_text}
