"""Input guardrail node — classifies user messages as safe or unsafe.

Includes recent conversation history for context so short follow-up
replies ("yes", "no") are not wrongly flagged.
"""

import json

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts import GUARDRAIL_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def _format_history_for_guardrail(recent_messages: list[dict]) -> str:
    """Build a short history block for the guardrail prompt."""
    if not recent_messages:
        return "(no prior conversation)"
    lines: list[str] = []
    for msg in recent_messages[-6:]:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


async def guardrail_node(state: AgentState) -> dict:
    """Classify the latest user message as safe or unsafe."""

    if not getattr(settings, "GUARDRAIL_ENABLED", True):
        logger.info(f"[{state.get('user_phone')}] guardrail: DISABLED — passing through")
        return {"is_safe": True, "block_reason": None}

    # Extract the latest user message text.
    user_text = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            user_text = msg.content if isinstance(msg.content, str) else str(msg.content)
            break

    if not user_text:
        return {"is_safe": True, "block_reason": None}

    # Include conversation history for context.
    history_block = _format_history_for_guardrail(state.get("recent_messages", []))

    try:
        model = ChatGoogleGenerativeAI(
            model=getattr(settings, "GUARDRAIL_MODEL", settings.GEMINI_MODEL),
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
        )

        user_content = (
            f"## Recent Conversation\n{history_block}\n\n"
            f"## Latest Message\n{user_text}"
        )

        response = await model.ainvoke(
            [
                {"role": "system", "content": GUARDRAIL_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ]
        )

        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(raw)
        is_safe = result.get("safe", True)
        reason = result.get("reason")

        logger.info(
            f"[{state.get('user_phone')}] guardrail: "
            f"safe={is_safe}{f' reason={reason}' if reason else ''}"
        )

        return {
            "is_safe": is_safe,
            "block_reason": reason if not is_safe else None,
        }

    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning(
            f"[{state.get('user_phone')}] guardrail: "
            f"failed to parse response ({exc}) — defaulting to SAFE"
        )
        return {"is_safe": True, "block_reason": None}

    except Exception as exc:
        logger.error(
            f"[{state.get('user_phone')}] guardrail error: {exc} — defaulting to SAFE"
        )
        return {"is_safe": True, "block_reason": None}
