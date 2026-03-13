"""Compatibility entrypoint for the agent graph.

The workflow has been split into dedicated modules:
- nodes: app.agent.nodes
- routing: app.agent.routing
- workflow assembly: app.agent.workflows

`create_graph()` is kept to avoid changing import sites.
"""

from typing import List

from langchain_core.tools import BaseTool
from langgraph.graph import StateGraph

from app.agent.workflows import build_chat_workflow


def create_graph(tools: List[BaseTool]) -> StateGraph:
    """Return the chat workflow graph (kept for backward compatibility)."""
    return build_chat_workflow(tools)
