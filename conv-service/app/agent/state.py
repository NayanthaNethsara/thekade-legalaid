"""Shared state schema for the LegalAid LangGraph pipeline.

Every node reads from and writes to this state. The graph is stateless —
conversation memory is injected by the ``load_memory`` node at the start
and persisted by ``save_memory`` at the end.
"""

from typing import Any, Optional

from langgraph.graph import MessagesState


class AgentState(MessagesState):
    """State for the LegalAid WhatsApp agent pipeline.

    Extends ``MessagesState`` (which holds ``messages`` as an append-only
    list) with per-user identity, memory, guardrail, prompt-refinement,
    query-generation, tool-decision, tool-execution, and response fields.
    """

    # ── Identity ──────────────────────────────────────────────────────────
    user_phone: str
    user_id: Optional[str]

    # ── Onboarding ────────────────────────────────────────────────────────
    user_status: Optional[str]          # guest | citizen | lawyer
    is_authorized: bool                 # True for citizen/lawyer only

    # ── Memory (injected by load_memory, persisted by save_memory) ────────
    recent_messages: list[dict[str, Any]]

    # ── Guardrail ─────────────────────────────────────────────────────────
    is_safe: bool
    block_reason: Optional[str]

    # ── Prompt Refinement ─────────────────────────────────────────────────
    refined_prompt: Optional[str]

    # ── Query Generation ──────────────────────────────────────────────────
    generated_query: Optional[str]

    # ── Tool Decision ─────────────────────────────────────────────────────
    should_use_tool: bool
    tool_name: Optional[str]
    tool_args: Optional[dict[str, Any]]

    # ── Tool Execution ────────────────────────────────────────────────────
    tool_result: Optional[str]

    # ── Response Generation ───────────────────────────────────────────────
    final_response: Optional[str]
