"""Chat workflow — the full LangGraph pipeline for the LegalAid agent.

Nodes:
  load_memory → guardrail → [route] → prompt_refiner → query_generator
  → tool_decider → [route] → tool_executor → response_generator
  → save_memory → END

The graph is fully stateless per invocation; memory is loaded and saved
at the boundaries.
"""

from typing import List

from langchain_core.tools import BaseTool
from langgraph.graph import END, StateGraph

from app.agent.nodes.guardrail import guardrail_node
from app.agent.nodes.load_memory import load_memory_node
from app.agent.nodes.prompt_refiner import prompt_refiner_node
from app.agent.nodes.query_generator import query_generator_node
from app.agent.nodes.response_generator import response_generator_node
from app.agent.nodes.save_memory import save_memory_node
from app.agent.nodes.tool_decider import build_tool_decider_node
from app.agent.nodes.tool_executor import build_tool_executor_node
from app.agent.routing import route_after_guardrail, route_after_tool_decider
from app.agent.state import AgentState


def build_chat_workflow(tools: List[BaseTool]) -> StateGraph:
    """Create the multi-node chat pipeline by composing nodes and routing."""

    builder = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────
    builder.add_node("load_memory", load_memory_node)
    builder.add_node("guardrail", guardrail_node)
    builder.add_node("prompt_refiner", prompt_refiner_node)
    builder.add_node("query_generator", query_generator_node)
    builder.add_node("tool_decider", build_tool_decider_node(tools))
    builder.add_node("tool_executor", build_tool_executor_node(tools))
    builder.add_node("response_generator", response_generator_node)
    builder.add_node("save_memory", save_memory_node)

    # ── Edges ─────────────────────────────────────────────────────────────
    # Entry
    builder.set_entry_point("load_memory")

    # Linear: load_memory → guardrail
    builder.add_edge("load_memory", "guardrail")

    # Conditional: guardrail → prompt_refiner (safe) | response_generator (blocked)
    builder.add_conditional_edges(
        "guardrail",
        route_after_guardrail,
        {
            "prompt_refiner": "prompt_refiner",
            "response_generator": "response_generator",
        },
    )

    # Linear: prompt_refiner → query_generator → tool_decider
    builder.add_edge("prompt_refiner", "query_generator")
    builder.add_edge("query_generator", "tool_decider")

    # Conditional: tool_decider → tool_executor (use_tool) | response_generator (no_tool)
    builder.add_conditional_edges(
        "tool_decider",
        route_after_tool_decider,
        {
            "tool_executor": "tool_executor",
            "response_generator": "response_generator",
        },
    )

    # Linear: tool_executor → response_generator
    builder.add_edge("tool_executor", "response_generator")

    # Linear: response_generator → save_memory → END
    builder.add_edge("response_generator", "save_memory")
    builder.add_edge("save_memory", END)

    return builder
