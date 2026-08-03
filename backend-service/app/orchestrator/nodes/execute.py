"""Tool-execution node for the reactive agent loop.

``execute_model_tools`` runs the tool calls an agent emits (search, cart
mutations, order creation, follow-up lookups) and feeds the results back to the
agent. It sanitizes args, formats results, handles errors, and executes
independent calls concurrently.
"""

import asyncio
import uuid
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.tools import BaseTool

from app.core.config import get_settings
from app.core.logging import clip, get_logger
from app.core.metrics import TOOL_CALLS_TOTAL
from app.orchestrator.state import AgentState
from app.orchestrator.tools.mcp_cache import (
    get_cached_result,
    is_cacheable_tool,
    is_miss,
    set_cached_result,
)
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import tool_output_to_text

logger = get_logger(__name__)

# Caps reason -> tools -> reason round-trips per turn so a confused model cannot
# loop; counted since the last human message.
_MAX_TOOL_ROUNDS_PER_TURN = 3


async def execute_model_tools(state: AgentState, *, tools: list[BaseTool]) -> dict[str, Any]:
    """Execute tool calls emitted by the reason model (reactive fallback)."""
    node_start("TOOLS NODE")

    last_message = state["messages"][-1] if state["messages"] else None
    pending_calls = getattr(last_message, "tool_calls", None) or []
    if not pending_calls:
        node_finish("TOOLS NODE", Note="no pending tool calls")
        return {}

    tool_map = {tool.name: tool for tool in tools}
    tool_calls = [
        {
            "name": call.get("name", ""),
            "args": call.get("args") or {},
            "id": call.get("id") or f"call_{uuid.uuid4().hex[:12]}",
        }
        for call in pending_calls
    ]
    tool_messages = await _run_tool_calls(tool_map, tool_calls)

    node_finish(
        "TOOLS NODE",
        Tools=", ".join(call["name"] for call in tool_calls) or "none",
        Count=len(tool_calls),
    )
    return {"messages": tool_messages}


def route_to_agent(state: AgentState) -> str:
    """Route from the plan node to the agent for the planner's target goal."""
    if state.get("target_goal", "chat") == "search":
        return "search_agent"
    return "chat_agent"


def route_after_agent(state: AgentState) -> str:
    """Send agent's tool calls to the reactive executor, bounded per turn."""
    last_message = state["messages"][-1] if state["messages"] else None
    if not (getattr(last_message, "tool_calls", None) or []):
        return "respond"
    if _tool_rounds_this_turn(state["messages"]) > _MAX_TOOL_ROUNDS_PER_TURN:
        logger.warning("orchestrator.execute.tool_round_budget_exhausted")
        return "respond"
    return "tools"


def _tool_rounds_this_turn(messages: list[Any]) -> int:
    rounds = 0
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            break
        if isinstance(message, AIMessage) and message.tool_calls:
            rounds += 1
    return rounds


async def _run_tool_calls(
    tool_map: dict[str, BaseTool], tool_calls: list[dict[str, Any]]
) -> list[ToolMessage]:
    """Run tool calls concurrently, preserving input order in the results."""
    return list(await asyncio.gather(*(_run_single_tool(tool_map, call) for call in tool_calls)))


async def _invoke_with_cache(tool: BaseTool, tool_name: str, tool_args: dict[str, Any]) -> Any:
    """Invoke a tool, serving read-only Kakille tools from Redis when possible.

    Caching read tools keeps repeat catalog lookups under the MCP server's
    60 req/min rate limit. Write tools and non-cacheable tools always hit the
    server. Only successful results are cached.
    """
    if not is_cacheable_tool(tool_name):
        return await tool.ainvoke(tool_args)

    cached = await get_cached_result(tool_name, tool_args)
    if not is_miss(cached):
        return cached

    tool_output = None
    for attempt in range(3):
        try:
            tool_output = await tool.ainvoke(tool_args)
            if isinstance(tool_output, str) and "rate limit" in tool_output.lower():
                raise RuntimeError(tool_output)
            break
        except Exception as error:
            logger.warning(
                "orchestrator.execute.tool_attempt_failed",
                tool=tool_name,
                attempt=attempt + 1,
                error=str(error),
            )
            if attempt == 2:
                if isinstance(error, RuntimeError) and "rate limit" in str(error).lower():
                    return str(error)
                raise
            # Sleep with exponential backoff (1s, 2s)
            await asyncio.sleep(2**attempt)

    if isinstance(tool_output, str) and tool_output.strip().startswith("Error"):
        return tool_output

    ttl_seconds = get_settings().mcp.cache_ttl_seconds
    await set_cached_result(tool_name, tool_args, tool_output, ttl_seconds)
    return tool_output


async def _run_single_tool(tool_map: dict[str, BaseTool], call: dict[str, Any]) -> ToolMessage:
    tool_name, tool_args, call_id = call["name"], call["args"], call["id"]

    # Every tool_call_id must get a ToolMessage, even for a hallucinated tool
    # name, or the next model invocation fails on the dangling call.
    if tool_name not in tool_map:
        logger.warning("orchestrator.execute.tool_not_found", name=tool_name)
        return ToolMessage(
            content=f"Unknown tool '{tool_name}'. Use only the tools provided.",
            name=tool_name or "unknown",
            tool_call_id=call_id,
        )

    logger.info("orchestrator.execute.running", tool=tool_name, args=tool_args, call_id=call_id)
    try:
        tool_output = await _invoke_with_cache(tool_map[tool_name], tool_name, tool_args)
        content_str = tool_output_to_text(tool_output)

        if isinstance(content_str, str) and content_str.strip().startswith("Error"):
            status = "rate_limited" if "rate limit" in content_str.lower() else "failed"
            TOOL_CALLS_TOTAL.labels(tool_name=tool_name, status=status).inc()
            logger.warning(
                "orchestrator.execute.tool_error",
                tool=tool_name,
                call_id=call_id,
                result=content_str,
            )
        else:
            TOOL_CALLS_TOTAL.labels(tool_name=tool_name, status="success").inc()
            logger.info(
                "orchestrator.execute.result",
                tool=tool_name,
                call_id=call_id,
                result=clip(content_str, 800),
            )
    except Exception as error:
        TOOL_CALLS_TOTAL.labels(tool_name=tool_name, status="failed").inc()
        logger.exception("orchestrator.execute.failed", name=tool_name, error=str(error))
        content_str = f"Tool execution failed: {error}"

    return ToolMessage(content=content_str, name=tool_name, tool_call_id=call_id)
