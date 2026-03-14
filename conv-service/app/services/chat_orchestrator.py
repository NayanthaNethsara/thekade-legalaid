"""Chat orchestrator — invokes the LangGraph pipeline and extracts the reply.

Memory loading and saving now happen inside the graph nodes
(``load_memory`` / ``save_memory``), so the orchestrator is a thin
wrapper that invokes the compiled graph and pulls out ``final_response``.
"""

from typing import Any

from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ChatOrchestrator:
    def __init__(self, agent: Any):
        self.agent = agent

    async def run(self, *, thread_id: str, user_id: str, text: str) -> str | None:
        """Run the full agent pipeline and return the final response text."""

        logger.info(f"[{thread_id}] orchestrator: invoking pipeline")

        result = await self.agent.ainvoke(
            {
                "messages": [("user", text)],
                "user_phone": thread_id,
                "user_id": user_id,
                "recent_messages": [],  # populated by load_memory node
                "is_safe": True,
                "block_reason": None,
                "refined_prompt": None,
                "generated_query": None,
                "should_use_tool": False,
                "tool_name": None,
                "tool_args": None,
                "tool_result": None,
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