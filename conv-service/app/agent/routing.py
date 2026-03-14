"""Routing functions for the LegalAid agent pipeline.

Each function inspects the current ``AgentState`` and returns the name
of the next node to transition to.
"""

from langgraph.graph import END

from app.agent.state import AgentState


def route_after_guardrail(state: AgentState) -> str:
    """After guardrail — skip to response generator if blocked."""
    if not state.get("is_safe", True):
        return "response_generator"
    return "prompt_refiner"


def route_after_tool_decider(state: AgentState) -> str:
    """After tool decider — execute tool or go straight to response."""
    if state.get("should_use_tool", False):
        return "tool_executor"
    return "response_generator"
