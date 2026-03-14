"""Response generator node — produces the final user-facing reply.

Handles five scenarios:
  1. **Unauthorized (guest)** → static onboarding message.
  2. **Blocked by guardrail** → polite rejection.
  3. **Multi-query with tool results** → synthesise all results + non-tool
     queries into a cohesive response, using the role-appropriate prompt.
  4. **General conversation** → LLM-generated reply.
  5. **Follow-up needed** → ask the user for missing info and save
     ``pending_follow_up`` for the next turn.

For lawyers: cite RAG sources, add "knowledge base doesn't have this"
disclaimer when no references exist, and suggest follow-up actions.
"""

import json

from langchain_core.messages import AIMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts import CITIZEN_SYSTEM_PROMPT, LAWYER_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


BLOCKED_RESPONSE = (
    "I'm sorry, but I can't process that request. "
    "If you have a legal question or need assistance, "
    "please feel free to ask — I'm here to help! 🙏"
)

ONBOARDING_RESPONSE = (
    "👋 Welcome to LegalAid! This is currently a test AI agent. "
    "Please contact the developers for early access.\n\n"
    "Once you are approved, you'll be able to ask legal questions, "
    "schedule meetings, and more."
)

ROLE_PROMPTS = {
    "citizen": CITIZEN_SYSTEM_PROMPT,
    "lawyer": LAWYER_SYSTEM_PROMPT,
}


def _format_history(recent_messages: list[dict]) -> str:
    if not recent_messages:
        return ""
    lines: list[str] = []
    for msg in recent_messages[-6:]:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def _build_context(state: AgentState) -> str:
    """Assemble all context parts for the LLM."""

    parts: list[str] = []

    # Conversation history
    history = _format_history(state.get("recent_messages", []))
    if history:
        parts.append(f"## Recent Conversation\n{history}")

    # Refined prompt
    refined = state.get("refined_prompt") or ""
    if refined:
        parts.append(f"## User Intent\n{refined}")

    # Original user message
    user_text = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            user_text = msg.content if isinstance(msg.content, str) else str(msg.content)
            break
    if user_text:
        parts.append(f"## Original User Message\n{user_text}")

    # Generated queries
    queries = state.get("generated_queries") or []
    if queries:
        queries_str = json.dumps(queries, indent=2, default=str)
        parts.append(f"## Extracted Queries ({len(queries)})\n{queries_str}")

    # Tool results
    tool_results = state.get("tool_results") or []
    if tool_results:
        result_lines: list[str] = []
        for tr in tool_results:
            status = "✅" if tr.get("success") else "❌"
            result_lines.append(
                f"{status} **{tr.get('tool_name', 'unknown')}**: {tr.get('result', '')}"
            )
        parts.append(f"## Tool Results\n" + "\n".join(result_lines))

    # Role of the user
    user_status = state.get("user_status", "citizen")
    parts.append(f"## User Role\n{user_status}")

    return "\n\n".join(parts)


async def response_generator_node(state: AgentState) -> dict:
    """Generate the final response for the user."""

    phone = state.get("user_phone", "unknown")

    # ── Scenario 1: Unauthorized (guest) ─────────────────────────────────
    if not state.get("is_authorized", True):
        logger.info(f"[{phone}] response_generator: UNAUTHORIZED (onboarding)")
        return {
            "final_response": ONBOARDING_RESPONSE,
            "messages": [AIMessage(content=ONBOARDING_RESPONSE)],
        }

    # ── Scenario 2: Guardrail blocked ────────────────────────────────────
    if not state.get("is_safe", True):
        reason = state.get("block_reason", "policy violation")
        logger.info(f"[{phone}] response_generator: BLOCKED ({reason})")
        return {
            "final_response": BLOCKED_RESPONSE,
            "messages": [AIMessage(content=BLOCKED_RESPONSE)],
        }

    # ── Select role-based system prompt ──────────────────────────────────
    user_status = state.get("user_status", "citizen")
    system_prompt = ROLE_PROMPTS.get(user_status, CITIZEN_SYSTEM_PROMPT)

    # ── Build context ────────────────────────────────────────────────────
    context = _build_context(state)

    try:
        model = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        )

        response = await model.ainvoke(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": context},
            ]
        )

        reply = response.content.strip()

        # ── Detect follow-up questions the assistant is asking ────────────
        pending_follow_up = None
        follow_up_indicators = [
            "would you like me to",
            "shall i",
            "could you provide",
            "what time",
            "what date",
            "which email",
            "can you confirm",
            "do you want me to",
        ]
        reply_lower = reply.lower()
        for indicator in follow_up_indicators:
            if indicator in reply_lower:
                # Extract the question (last sentence with "?")
                sentences = reply.split("?")
                question = ""
                for s in reversed(sentences):
                    s = s.strip()
                    if any(ind in s.lower() for ind in follow_up_indicators):
                        question = s + "?"
                        break
                if question:
                    pending_follow_up = {
                        "question": question,
                        "context": reply[:200],
                    }
                    break

        logger.info(
            f"[{phone}] response_generator: '{reply[:100]}'"
            + (f" (follow-up pending)" if pending_follow_up else "")
        )

        result: dict = {
            "final_response": reply,
            "messages": [AIMessage(content=reply)],
        }
        if pending_follow_up:
            result["pending_follow_up"] = pending_follow_up

        return result

    except Exception as exc:
        logger.error(f"[{phone}] response_generator error: {exc}")
        fallback = (
            "I'm having trouble processing your request right now. "
            "Please try again shortly."
        )
        return {
            "final_response": fallback,
            "messages": [AIMessage(content=fallback)],
        }
