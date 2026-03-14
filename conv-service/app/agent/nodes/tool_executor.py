"""Tool executor node — invokes the selected MCP tool.

Finds the matching tool from the loaded tools list, calls it with
the arguments provided by the tool decider, and stores the result
in state.
"""

import json
from typing import Any

from langchain_core.tools import BaseTool

from app.agent.state import AgentState
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def build_tool_executor_node(tools: list[BaseTool]):
    """Factory that returns a tool-executor node bound to the given tools."""

    # Build a lookup map for O(1) access.
    tool_map: dict[str, BaseTool] = {t.name: t for t in tools}

    async def tool_executor_node(state: AgentState) -> dict:
        """Execute the tool chosen by the tool decider."""

        tool_name: str | None = state.get("tool_name")
        tool_args: dict[str, Any] | None = state.get("tool_args")

        if not tool_name:
            logger.warning(
                f"[{state.get('user_phone')}] tool_executor: "
                "no tool_name in state — skipping"
            )
            return {"tool_result": None}

        tool = tool_map.get(tool_name)
        if tool is None:
            error_msg = f"Tool '{tool_name}' not found in loaded tools"
            logger.error(
                f"[{state.get('user_phone')}] tool_executor: {error_msg}"
            )
            return {"tool_result": json.dumps({"error": error_msg})}

        resolved_args = tool_args or {}
        logger.info(
            f"[{state.get('user_phone')}] tool_executor: "
            f"invoking {tool_name} with {json.dumps(resolved_args)[:200]}"
        )

        try:
            # Prefer async invocation.
            if hasattr(tool, "ainvoke"):
                result = await tool.ainvoke(resolved_args)
            else:
                result = tool.invoke(resolved_args)

            # Normalise to string for downstream consumption.
            if isinstance(result, str):
                result_str = result
            elif isinstance(result, dict):
                result_str = json.dumps(result, default=str)
            else:
                result_str = str(result)

            logger.info(
                f"[{state.get('user_phone')}] tool_executor: "
                f"{tool_name} returned {len(result_str)} chars"
            )
            return {"tool_result": result_str}

        except Exception as exc:
            error_msg = f"Tool '{tool_name}' execution failed: {exc}"
            logger.error(
                f"[{state.get('user_phone')}] tool_executor: {error_msg}"
            )
            return {"tool_result": json.dumps({"error": error_msg})}

    return tool_executor_node
