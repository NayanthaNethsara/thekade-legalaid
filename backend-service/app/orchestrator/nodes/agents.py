from typing import Any

from langchain_core.messages import SystemMessage

from app.core.logging import clip, get_logger
from app.orchestrator.constants import (
    LANGUAGE_NAMES,
    LANGUAGE_PERSONA_NOTES,
    LANGUAGE_SCRIPT_RULES,
)
from app.orchestrator.prompts import (
    CHAT_GUIDE_PROMPT,
    GENERAL_OPERATIONS_PROMPT,
    MISSION_PROMPT,
    PERSONA_PROMPT,
    SEARCH_GUIDE_PROMPT,
    SEARCH_TOOL_PROMPT,
    WORKSPACE_TOOL_PROMPT,
)
from app.orchestrator.state import AgentState
from app.orchestrator.utils.prompt_context import build_state_context
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import message_text, render_llm_input

logger = get_logger(__name__)

# Reactive search loop's per-turn budget. Mirrors the cap stated in
# SEARCH_TOOL_PROMPT.
MAX_SEARCHES_PER_TURN = 3

_CHANNEL_FORMAT_GUIDES = {
    "web": (
        "Output channel: web chat. Write the reply in Markdown -- you may use "
        "**bold** and short bullet lists."
    ),
    "whatsapp": (
        "Output channel: WhatsApp. Use WhatsApp markup only: *single asterisks* "
        "for bold (never **double**), no '#' headings, and write any link as a "
        "plain URL (no [label](url) syntax)."
    ),
}

_EMOTION_GUIDANCE = {
    "sad": "The user seems sad -- be gentle and comforting, and "
    "acknowledge how they feel before anything else.",
    "stressed": "The user seems stressed -- be calm and reassuring, "
    "keep it simple, and don't add pressure.",
    "angry": "The user seems angry -- stay calm and de-escalate; "
    "acknowledge the frustration and don't get defensive.",
    "celebrating": "The user is celebrating -- match their excitement and be warm and upbeat.",
}

_ROUTER_BASE = (
    f"{MISSION_PROMPT}\n\n"
    f"{PERSONA_PROMPT}\n\n"
    "You are the Kakille legal aid assistant. You can use tools to gather data "
    "(legal knowledge search, the user's sources, notes, reminders).\n"
    "When you need to use a tool, ONLY output the tool call (do not write conversational "
    "text to the user).\n"
    "When you have the tool results and are ready to reply, write the FINAL conversational "
    "response directly to the user.\n\n"
)

SEARCH_AGENT_PROMPT = (
    f"{_ROUTER_BASE}{GENERAL_OPERATIONS_PROMPT}\n\n{SEARCH_GUIDE_PROMPT}\n\n{SEARCH_TOOL_PROMPT}"
)
CHAT_AGENT_PROMPT = (
    f"{_ROUTER_BASE}{GENERAL_OPERATIONS_PROMPT}\n\n{CHAT_GUIDE_PROMPT}\n\n{WORKSPACE_TOOL_PROMPT}"
)


def _build_dynamic_prompt(state: AgentState) -> str:
    sections = [
        "Dynamic Context:",
        _CHANNEL_FORMAT_GUIDES.get(state.get("channel", "web"), _CHANNEL_FORMAT_GUIDES["web"]),
        *build_state_context(state),
    ]

    if emotion_guidance := _EMOTION_GUIDANCE.get(state.get("detected_emotion", "neutral")):
        sections.append(emotion_guidance)

    language_tag = state.get("detected_language", "")
    language = LANGUAGE_NAMES.get(language_tag)
    script_rule = LANGUAGE_SCRIPT_RULES.get(language_tag)
    if language and script_rule:
        sections.append(
            f"Language: write your ENTIRE reply in {language}. {script_rule} "
            "Scripts must never mix within the reply, and never switch to another language."
        )
    else:
        sections.append(
            "ALWAYS reply in the exact language and script the user is using. "
            "If the user wrote in Latin letters (Singlish/Tanglish), "
            "reply in Latin letters only."
        )

    if persona_note := LANGUAGE_PERSONA_NOTES.get(language_tag):
        sections.append(f"Register for this language: {persona_note}")

    return "\n\n".join(sections)


async def _invoke_agent(
    state: AgentState, model: Any, static_prompt: str, agent_name: str
) -> dict[str, Any]:
    node_start(f"{agent_name.upper()} NODE")

    static_msg = SystemMessage(content=static_prompt)
    dynamic_msg = SystemMessage(content=_build_dynamic_prompt(state))

    messages = [static_msg, dynamic_msg, *state["messages"]]

    logger.info(
        f"orchestrator.{agent_name}.input",
        message_count=len(state["messages"]),
        llm_input=render_llm_input(messages),
    )

    response = await model.ainvoke(messages)

    tool_call_names = [c["name"] for c in getattr(response, "tool_calls", None) or []]
    logger.info(
        f"orchestrator.{agent_name}.output",
        response_text=clip(message_text(response), 600),
        tool_calls=tool_call_names,
    )

    node_finish(
        f"{agent_name.upper()} NODE",
        **{
            "Tool Calls": ", ".join(tool_call_names) or "none",
            "Response": clip(message_text(response), 60),
        },
    )

    return {"messages": [response]}


async def search_agent(state: AgentState, *, model: Any) -> dict[str, Any]:
    return await _invoke_agent(state, model, SEARCH_AGENT_PROMPT, "search_agent")


async def chat_agent(state: AgentState, *, model: Any) -> dict[str, Any]:
    return await _invoke_agent(state, model, CHAT_AGENT_PROMPT, "chat_agent")
