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
    list) with per-user identity, onboarding, memory, guardrail,
    prompt-refinement, multi-query generation, tool execution, follow-up
    tracking, and response fields.
    """

    # ── Identity ──────────────────────────────────────────────────────────
    user_phone: str
    user_id: Optional[str]

    # ── Onboarding ────────────────────────────────────────────────────────
    user_status: Optional[str]          # guest | citizen | lawyer
    is_authorized: bool                 # True for citizen/lawyer only

    # ── Memory (injected by load_memory, persisted by save_memory) ────────
    recent_messages: list[dict[str, Any]]

    # ── Follow-up Tracking ────────────────────────────────────────────────
    # Tracks the last question the assistant asked the user, so that short
    # replies like "yes", "no", "3pm" can be resolved in context.
    pending_follow_up: Optional[dict[str, Any]]

    # ── Guardrail ─────────────────────────────────────────────────────────
    is_safe: bool
    block_reason: Optional[str]

    # ── Prompt Refinement ─────────────────────────────────────────────────
    refined_prompt: Optional[str]

    # ── Query Generation (multi-query) ────────────────────────────────────
    # List of extracted queries, each with: query_type, query, entities
    generated_queries: Optional[list[dict[str, Any]]]

    # ── Tool Decision & Execution (multi-tool) ────────────────────────────
    # List of tool executions decided by tool_decider:
    #   [{query_index, use_tool, tool_name, tool_args}]
    tool_executions: Optional[list[dict[str, Any]]]
    # Results from executing tools:
    #   [{tool_name, args, result, success}]
    tool_results: Optional[list[dict[str, Any]]]

    # ── Response Generation ───────────────────────────────────────────────
    final_response: Optional[str]
