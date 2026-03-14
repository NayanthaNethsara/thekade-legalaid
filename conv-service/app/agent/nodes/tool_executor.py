"""Tool executor node — runs multiple tool calls in sequence.

Receives ``tool_executions`` from the tool decider and invokes each
selected tool, collecting results into ``tool_results``.
"""

import json

from langchain_core.tools import BaseTool

from app.agent.state import AgentState
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def build_tool_executor_node(tools: list[BaseTool]):
    """Factory — returns a node function with the tool list bound."""

    tool_map: dict[str, BaseTool] = {t.name: t for t in tools}

    async def tool_executor_node(state: AgentState) -> dict:
        """Execute all planned tool calls and collect results."""

        executions = state.get("tool_executions") or []
        if not executions:
            return {"tool_results": []}

        results: list[dict] = []

        for execution in executions:
            tool_name = execution.get("tool_name", "")
            tool_args = execution.get("tool_args") or {}
            query_index = execution.get("query_index", -1)

            tool = tool_map.get(tool_name)
            if not tool:
                logger.warning(
                    f"[{state.get('user_phone')}] tool_executor: "
                    f"tool '{tool_name}' not found — skipping"
                )
                results.append({
                    "query_index": query_index,
                    "tool_name": tool_name,
                    "args": tool_args,
                    "result": f"Tool '{tool_name}' not found",
                    "success": False,
                })
                continue

            try:
                logger.info(
                    f"[{state.get('user_phone')}] tool_executor: "
                    f"invoking {tool_name}({json.dumps(tool_args)[:100]})"
                )

                if hasattr(tool, "ainvoke"):
                    result = await tool.ainvoke(tool_args)
                else:
                    result = tool.invoke(tool_args)

                # Normalise result to string.
                if hasattr(result, "content"):
                    result_str = str(result.content)
                elif isinstance(result, str):
                    result_str = result
                else:
                    result_str = json.dumps(result, default=str)

                logger.info(
                    f"[{state.get('user_phone')}] tool_executor: "
                    f"{tool_name} → {result_str[:120]}"
                )

                results.append({
                    "query_index": query_index,
                    "tool_name": tool_name,
                    "args": tool_args,
                    "result": result_str,
                    "success": True,
                })

            except Exception as exc:
                logger.error(
                    f"[{state.get('user_phone')}] tool_executor: "
                    f"{tool_name} error: {exc}"
                )
                results.append({
                    "query_index": query_index,
                    "tool_name": tool_name,
                    "args": tool_args,
                    "result": f"Error: {exc}",
                    "success": False,
                })

        return {"tool_results": results}

    return tool_executor_node
