"""Prompt refiner node — contextualises the raw user message.

Takes the latest user message together with recent conversation history
and produces a self-contained, clear reformulation that downstream nodes
(query generator, tool decider) can work with reliably.
"""

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

REFINER_SYSTEM_PROMPT = """\
You are a prompt-refinement module for a Sri Lankan legal-aid WhatsApp chatbot.

Given:
  • The user's latest message
  • Recent conversation history (if any)

Your job:
  1. Resolve pronouns, references, and abbreviations using the conversation context.
  2. Identify the user's core intent.
  3. Produce a single, clear, self-contained request sentence.

Rules:
  - Output ONLY the refined prompt — no explanations, no preamble.
  - Preserve the user's language (Sinhala, Tamil, or English).
  - If the message is already clear, return it as-is.
"""


def _format_history(recent_messages: list[dict]) -> str:
    """Format cached conversation turns into a readable block."""
    if not recent_messages:
        return "(no prior conversation)"

    lines: list[str] = []
    for msg in recent_messages[-6:]:  # last 6 turns max
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

    try:
        model = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
        )

        response = await model.ainvoke(
            [
                {"role": "system", "content": REFINER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"## Conversation History\n{history_block}\n\n"
                        f"## Latest Message\n{user_text}"
                    ),
                },
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
