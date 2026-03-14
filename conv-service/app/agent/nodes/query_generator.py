"""Query generator node — extracts multiple intents from a single message.

Produces a JSON array of query objects, each with:
  query_type, query, entities

Supports: legal_question, schedule_meeting, set_reminder, keep_note,
do_research, send_documents, general_chat.
"""

import json

from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts import QUERY_GEN_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


async def query_generator_node(state: AgentState) -> dict:
    """Generate a list of structured queries from the refined prompt."""

    refined = state.get("refined_prompt") or ""
    if not refined:
        return {"generated_queries": []}

    try:
        model = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
        )

        response = await model.ainvoke(
            [
                {"role": "system", "content": QUERY_GEN_SYSTEM_PROMPT},
                {"role": "user", "content": refined},
            ]
        )

        raw = response.content.strip()

        # Strip markdown code fences if present.
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        queries = json.loads(raw)

        # Normalise: if a single dict was returned, wrap in list.
        if isinstance(queries, dict):
            queries = [queries]

        if not isinstance(queries, list):
            raise ValueError(f"Expected list, got {type(queries)}")

        logger.info(
            f"[{state.get('user_phone')}] query_generator: "
            f"extracted {len(queries)} queries"
        )
        return {"generated_queries": queries}

    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning(
            f"[{state.get('user_phone')}] query_generator: "
            f"JSON parse failed ({exc}) — using refined prompt as fallback"
        )
        fallback = [{
            "query_type": "general_chat",
            "query": refined,
            "entities": {},
        }]
        return {"generated_queries": fallback}

    except Exception as exc:
        logger.error(
            f"[{state.get('user_phone')}] query_generator error: {exc}"
        )
        fallback = [{
            "query_type": "general_chat",
            "query": refined,
            "entities": {},
        }]
        return {"generated_queries": fallback}
