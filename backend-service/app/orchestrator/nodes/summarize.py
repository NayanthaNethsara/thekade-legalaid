from collections.abc import Sequence
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    RemoveMessage,
    SystemMessage,
)

from app.core.logging import get_logger
from app.orchestrator.constants import (
    COMPACTION_POLICIES,
    DEFAULT_COMPACTION_POLICY,
    SUMMARY_MAX_CHARS,
)
from app.orchestrator.prompts import SUMMARY_PROMPT
from app.orchestrator.state import AgentState
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import message_text, render_llm_input

logger = get_logger(__name__)


def should_summarize(state: AgentState) -> str:
    policy = _policy_for(state)
    if len(state["messages"]) > policy.max_messages:
        return "summarize"
    return "load_memory"


async def summarize(state: AgentState, *, model: BaseChatModel) -> dict[str, Any]:
    policy = _policy_for(state)
    to_prune, _kept = _split_at_turn_boundary(state["messages"], policy.keep_messages)
    if not to_prune:
        return {}

    node_start("SUMMARIZE NODE")

    try:
        summary = await _fold(model, state.get("summary", ""), _render_transcript(to_prune))
        if len(summary) > SUMMARY_MAX_CHARS:
            summary = await _fold(model, "", summary)
        logger.info("orchestrator.summarize.completed", message_count=len(to_prune))
    except Exception:
        logger.warning("summarize.failed", exc_info=True)
        return {}

    node_finish(
        "SUMMARIZE NODE",
        **{"Messages Pruned": len(to_prune), "Summary": summary},
    )

    removals = [RemoveMessage(id=mid) for message in to_prune if (mid := message.id) is not None]
    return {"summary": summary, "messages": removals}


async def _fold(model: BaseChatModel, existing: str, transcript: str) -> str:
    user_content = f"Existing summary:\n{existing or '(none)'}\n\nNew exchange:\n{transcript}"
    prompt = [
        SystemMessage(content=SUMMARY_PROMPT),
        HumanMessage(content=user_content),
    ]
    logger.debug("orchestrator.summarize.input", llm_input=render_llm_input(prompt))
    response = await model.ainvoke(prompt)
    result = message_text(response)
    logger.debug("orchestrator.summarize.output", summary=result)
    return result


def _policy_for(state: AgentState) -> Any:
    return COMPACTION_POLICIES.get(state.get("channel", "web"), DEFAULT_COMPACTION_POLICY)


def _split_at_turn_boundary(
    messages: Sequence[BaseMessage], keep: int
) -> tuple[Sequence[BaseMessage], Sequence[BaseMessage]]:
    if len(messages) <= keep:
        return [], messages

    cut = len(messages) - keep
    while cut < len(messages) and not isinstance(messages[cut], HumanMessage):
        cut += 1
    if cut >= len(messages):
        return [], messages
    return messages[:cut], messages[cut:]


def _render_transcript(messages: Sequence[BaseMessage]) -> str:
    lines: list[str] = []
    for message in messages:
        if isinstance(message, HumanMessage):
            lines.append(f"Customer: {message_text(message)}")
        elif isinstance(message, AIMessage):
            text = message_text(message)
            if text:
                lines.append(f"Assistant: {text}")
            for call in message.tool_calls:
                lines.append(f"Assistant used {call['name']} with {call['args']}")
    return "\n".join(lines)
