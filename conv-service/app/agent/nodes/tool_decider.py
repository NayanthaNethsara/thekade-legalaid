"""Tool decider node — maps multiple queries to available tools.

Receives ``generated_queries`` (list of query objects) and decides for
each one whether a tool should be called. Produces ``tool_executions``
list for the tool executor.
"""

import json

from langchain_core.tools import BaseTool
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts import TOOL_DECIDER_SYSTEM_PROMPT_TEMPLATE
from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def build_tool_decider_node(tools: list[BaseTool]):
    """Factory — returns a node function with the tool list bound."""

    # Pre-build tool descriptions.
    if tools:
        desc_lines: list[str] = []
        for t in tools:
            desc_lines.append(f"- **{t.name}**: {t.description}")
        tool_descriptions = "\n".join(desc_lines)
    else:
        tool_descriptions = "(no tools available)"

    system_prompt = TOOL_DECIDER_SYSTEM_PROMPT_TEMPLATE.format(
        tool_descriptions=tool_descriptions
    )

    async def tool_decider_node(state: AgentState) -> dict:
        """Decide which tools to call for each generated query."""

        queries = state.get("generated_queries") or []
        if not queries:
            return {"tool_executions": []}

        # If no tools available, skip everything.
        if not tools:
            logger.info(
                f"[{state.get('user_phone')}] tool_decider: "
                f"no tools available — skipping {len(queries)} queries"
            )
            return {"tool_executions": []}

        try:
            model = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.0,
            )

            response = await model.ainvoke(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(queries)},
                ]
            )

            raw = response.content.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            decisions = json.loads(raw)
            if isinstance(decisions, dict):
                decisions = [decisions]

            # Filter to only the ones that need tools.
            tool_execs = [d for d in decisions if d.get("use_tool")]

            logger.info(
                f"[{state.get('user_phone')}] tool_decider: "
                f"{len(tool_execs)}/{len(queries)} queries need tools"
            )
            return {"tool_executions": tool_execs}

        except Exception as exc:
            logger.error(
                f"[{state.get('user_phone')}] tool_decider error: {exc}"
            )
            return {"tool_executions": []}

    return tool_decider_node
