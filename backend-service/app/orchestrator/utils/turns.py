"""Helpers for reading the LangGraph message history.

Nodes constantly need two things: the plain text of a message (whose content
may be a string, content blocks, or a JSON-encoded block list) and "what
happened since the customer last spoke". They live here so every node can
depend on them without dragging in unrelated product-parsing code.
"""

import json
from collections.abc import Sequence
from typing import Any

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)


def message_text(message: BaseMessage) -> str:
    """Recover markdown text whether content is a string, blocks, or a JSON string."""
    content = message.content
    if isinstance(content, list):
        return "\n".join(_block_text(block) for block in content)
    if isinstance(content, str):
        stripped = content.strip()
        if stripped.startswith("[") and '"type"' in stripped:
            try:
                return "\n".join(_block_text(block) for block in json.loads(stripped))
            except (ValueError, TypeError):
                return content
        return content
    return str(content)


def latest_user_text(messages: Sequence[BaseMessage]) -> str:
    """The text of the most recent customer message, or empty when there is none."""
    message = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    return message_text(message) if message is not None else ""


def current_turn_messages(messages: Sequence[BaseMessage]) -> list[BaseMessage]:
    """Messages produced since the latest customer message."""
    return list(messages[_last_human_index(messages) + 1 :])


def split_at_last_human(
    messages: Sequence[BaseMessage],
) -> tuple[list[BaseMessage], list[BaseMessage]]:
    """Split into (history up to and including the last customer message,
    the internal execution messages produced after it this turn)."""
    index = _last_human_index(messages)
    return list(messages[: index + 1]), list(messages[index + 1 :])


def _last_human_index(messages: Sequence[BaseMessage]) -> int:
    """Index of the latest customer message, or -1 when there is none."""
    last_human = -1
    for index, message in enumerate(messages):
        if isinstance(message, HumanMessage):
            last_human = index
    return last_human


def current_turn_tool_messages(messages: Sequence[BaseMessage]) -> list[ToolMessage]:
    """Tool messages produced since the latest customer message."""
    return [m for m in current_turn_messages(messages) if isinstance(m, ToolMessage)]


def render_llm_input(messages: Sequence[BaseMessage]) -> str:
    """Render exactly what is sent to a model, minus the system prompt.

    Used for logging the full context each LLM layer receives. The system
    message holds the static persona/policy and is intentionally dropped;
    everything else (history, tool calls and their results) is shown verbatim
    and untruncated so the logged payload matches what the model saw.
    """
    lines: list[str] = []
    for message in messages:
        if isinstance(message, SystemMessage):
            continue
        if isinstance(message, HumanMessage):
            lines.append(f"[Human] {message_text(message)}")
        elif isinstance(message, AIMessage):
            text = message_text(message)
            if text:
                lines.append(f"[AI] {text}")
            for call in message.tool_calls:
                lines.append(f"[AI tool_call] {call['name']}({call['args']})")
        elif isinstance(message, ToolMessage):
            lines.append(f"[Tool result] {message_text(message)}")
        else:
            lines.append(f"[{type(message).__name__}] {message_text(message)}")
    return "\n".join(lines)


def _block_text(block: Any) -> str:
    if isinstance(block, str):
        return block
    if isinstance(block, dict) and block.get("type") == "text":
        return str(block.get("text", ""))
    return ""


def tool_output_to_text(output: Any) -> str:
    """Render a raw tool result as text.

    MCP tools return a list of content blocks (``[{'type': 'text', 'text': ...}]``).
    Joining their text payloads keeps the stored message parseable as JSON instead of
    a Python ``repr`` of the block list, which ``str()`` would otherwise produce.
    """
    if isinstance(output, list):
        text = "\n".join(_block_text(block) for block in output)
        if text.strip():
            return text
    if isinstance(output, str):
        return output
    return str(output)


def render_conversation_history(
    messages: Sequence[BaseMessage],
    max_turns: int,
    *,
    exclude_last: bool = False,
    include_tool_calls: bool = False,
) -> str:
    """Render conversation history as plain text for model prompts or logging."""
    slice_end = -1 if exclude_last else None
    sliced = messages[-max_turns:slice_end] if slice_end else messages[-max_turns:]

    lines: list[str] = []
    for msg in sliced:
        if isinstance(msg, HumanMessage):
            lines.append(f"Customer: {message_text(msg)}")
        elif isinstance(msg, AIMessage):
            text = message_text(msg)
            if text:
                lines.append(f"Assistant: {text}")
            if include_tool_calls and msg.tool_calls:
                calls_str = ", ".join(
                    f"{call['name']} with args {call['args']}" for call in msg.tool_calls
                )
                lines.append(f"Assistant ran tools: {calls_str}")
    return "\n".join(lines)


def render_last_exchanges(messages: Sequence[BaseMessage], max_exchanges: int = 3) -> str:
    """Render the last N human exchanges plus the assistant messages between them."""
    parts: list[str] = []
    count = 0
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            parts.append(f"Customer: {message_text(message)}")
            count += 1
        elif isinstance(message, AIMessage) and message_text(message):
            parts.append(f"Assistant: {message_text(message)}")
        if count >= max_exchanges:
            break
    parts.reverse()
    return "\n".join(parts)
