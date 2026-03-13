from typing import Optional
from langgraph.graph import MessagesState


class AgentState(MessagesState):
    """State for the LegalAid WhatsApp agent.

    Extends MessagesState (which holds 'messages' as an append-only list)
    with per-user identity fields so every node knows whose conversation
    it is processing.
    """
    user_phone: str
    user_id: Optional[str]
