from typing import List

from langchain_core.tools import BaseTool
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from app.agent.nodes import build_chat_agent_node
from app.agent.routing import route_after_agent
from app.agent.state import AgentState


def build_chat_workflow(tools: List[BaseTool]) -> StateGraph:
    """Create the chat workflow by composing nodes and routing rules."""
    builder = StateGraph(AgentState)
    builder.add_node("agent", build_chat_agent_node(tools))

    if tools:
        builder.add_node("tools", ToolNode(tools))
        builder.add_conditional_edges("agent", route_after_agent, {"tools": "tools", END: END})
        builder.add_edge("tools", "agent")
    else:
        builder.add_edge("agent", END)

    builder.set_entry_point("agent")
    return builder
