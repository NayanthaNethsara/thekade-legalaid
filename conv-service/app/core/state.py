from typing import TypedDict, Optional, Dict, Any
from app.models.user import User

class AgentState(TypedDict):
    """
    State for the conversation graph.
    """
    message: Dict[str, Any]
    user: Optional[User]
    next_node: Optional[str]
    # Add other fields as necessary, e.g. conversation history
