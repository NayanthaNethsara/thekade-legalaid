from langchain_core.messages import AIMessage, HumanMessage

from app.agent.state import AgentState
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def echo_agent_node(state: AgentState):
    """Echo-mode node used to validate the end-to-end message pipeline."""
    human_messages = [m for m in state["messages"] if isinstance(m, HumanMessage)]
    last_text = human_messages[-1].content if human_messages else "(no message)"
    echo = f"[ECHO] {last_text}"
    logger.info(f"Echo reply for {state.get('user_phone')}: {echo}")
    return {"messages": [AIMessage(content=echo)]}
