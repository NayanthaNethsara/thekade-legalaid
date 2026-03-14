"""Query generator node — converts the refined prompt into a structured query.

Analyses the refined prompt to determine:
  • Query type (legal_question | meeting_request | general_chat)
  • Key entities and parameters
  • A structured query string for the tool decider
"""

import json

from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

QUERY_GEN_SYSTEM_PROMPT = """\
You are a query-generation module for a Sri Lankan legal-aid WhatsApp chatbot.

Given the refined user prompt, produce a JSON object with:
{
  "query_type": "legal_question" | "meeting_request" | "general_chat",
  "query": "<a concise, optimised search/action query>",
  "entities": {
    // key-value pairs extracted from the prompt, e.g.
    // "topic": "land dispute", "location": "Colombo"
    // For meeting requests: "title", "date", "time", "duration", "attendees"
  }
}

Rules:
  - Output ONLY the JSON — no markdown fences, no extra text.
  - "query" should be a concise, search-engine-style query for legal questions,
    or a natural-language summary for other types.
  - If the user is just chatting or greeting, use query_type "general_chat".
"""


async def query_generator_node(state: AgentState) -> dict:
    """Generate a structured query from the refined prompt."""

    refined = state.get("refined_prompt") or ""
    if not refined:
        return {"generated_query": None}

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

        # Validate it's valid JSON, then store as string for downstream nodes.
        json.loads(raw)  # validation only
        logger.info(
            f"[{state.get('user_phone')}] query_generator: {raw[:120]}"
        )
        return {"generated_query": raw}

    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning(
            f"[{state.get('user_phone')}] query_generator: "
            f"JSON parse failed ({exc}) — using refined prompt as fallback"
        )
        fallback = json.dumps({
            "query_type": "general_chat",
            "query": refined,
            "entities": {},
        })
        return {"generated_query": fallback}

    except Exception as exc:
        logger.error(
            f"[{state.get('user_phone')}] query_generator error: {exc}"
        )
        fallback = json.dumps({
            "query_type": "general_chat",
            "query": refined,
            "entities": {},
        })
        return {"generated_query": fallback}
