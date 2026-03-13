from langchain_core.messages import AIMessage, BaseMessage
from langgraph.graph import END

from app.agent.state import AgentState


def route_after_agent(state: AgentState) -> str:
    """Route to tool execution only when the latest AI message requested tools."""
    last: BaseMessage = state["messages"][-1]
    if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
        return "tools"
    return END
