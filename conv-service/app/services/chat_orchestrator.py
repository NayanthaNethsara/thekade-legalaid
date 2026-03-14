"""Chat orchestrator — invokes the LangGraph pipeline and extracts the reply.

Memory loading/saving, onboarding, and follow-up tracking all happen
inside the graph nodes, so the orchestrator is a thin wrapper.
"""

from typing import Any

from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ChatOrchestrator:
    def __init__(self, agent: Any):
        self.agent = agent

    async def run(self, *, thread_id: str, user_id: str | None, text: str) -> str | None:
        """Run the full agent pipeline and return the final response text."""

        logger.info(f"[{thread_id}] orchestrator: invoking pipeline")

        result = await self.agent.ainvoke(
            {
                "messages": [("user", text)],
                "user_phone": thread_id,
                "user_id": user_id,
                # Onboarding
                "user_status": None,
                "is_authorized": False,
                # Memory (populated by load_memory)
                "recent_messages": [],
                "pending_follow_up": None,
                # Guardrail
                "is_safe": True,
                "block_reason": None,
                # Prompt refinement
                "refined_prompt": None,
                # Query generation (multi-query)
                "generated_queries": None,
                # Tool decision & execution (multi-tool)
                "tool_executions": None,
                "tool_results": None,
                # Response
                "final_response": None,
            },
            config={"configurable": {"thread_id": thread_id}},
        )

        reply = result.get("final_response")

        if reply:
            logger.info(f"[{thread_id}] orchestrator: reply='{reply[:100]}'")
        else:
            logger.warning(f"[{thread_id}] orchestrator: no final_response in state")

        return reply