"""Tool decider node — decides whether to call a tool, and which one.

Inspects the structured query from the query generator and the list of
available tool descriptions to make a decision.  Uses a lightweight LLM
call with structured JSON output.
"""

import json
from typing import Any

from langchain_core.tools import BaseTool
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


def _describe_tools(tools: list[BaseTool]) -> str:
    """Build a plain-text catalogue of available tools."""
    if not tools:
        return "(no tools available)"

    lines: list[str] = []
    for tool in tools:
        desc = getattr(tool, "description", "") or ""
        schema = ""
        if hasattr(tool, "args_schema") and tool.args_schema:
            try:
                schema = json.dumps(
                    tool.args_schema.schema(), indent=2, default=str
                )
            except Exception:
                schema = "(schema unavailable)"
        lines.append(
            f"### {tool.name}\n{desc}\nInput schema:\n```json\n{schema}\n```"
        )
    return "\n\n".join(lines)


TOOL_DECIDER_SYSTEM_PROMPT_TEMPLATE = """\
You are a tool-routing module for a Sri Lankan legal-aid WhatsApp chatbot.

## Available Tools
{tool_descriptions}

## Instructions
Given the structured query (JSON), decide whether a tool should be called.

Respond ONLY with a JSON object — no markdown fences, no extra text:

If a tool should be used:
{{"use_tool": true, "tool_name": "<exact tool name>", "tool_args": {{<arguments matching the tool schema>}}}}

If no tool is needed (e.g. general chat, greetings, simple questions):
{{"use_tool": false}}

Rules:
  - Match the tool name EXACTLY to one of the available tools.
  - Fill in ALL required arguments from the query entities.
  - If required arguments are missing, set use_tool to false.
"""


def build_tool_decider_node(tools: list[BaseTool]):
    """Factory that returns a tool-decider node bound to the given tools."""

    tool_descriptions = _describe_tools(tools)
    system_prompt = TOOL_DECIDER_SYSTEM_PROMPT_TEMPLATE.format(
        tool_descriptions=tool_descriptions
    )

    async def tool_decider_node(state: AgentState) -> dict:
        """Decide whether a tool is needed and which one to call."""

        query_json = state.get("generated_query")
        if not query_json:
            return {
                "should_use_tool": False,
                "tool_name": None,
                "tool_args": None,
            }

        # If there are no tools loaded, skip.
        if not tools:
            logger.info(
                f"[{state.get('user_phone')}] tool_decider: no tools available"
            )
            return {
                "should_use_tool": False,
                "tool_name": None,
                "tool_args": None,
            }

        try:
            model = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.0,
            )

            response = await model.ainvoke(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query_json},
                ]
            )

            raw = response.content.strip()

            # Strip markdown code fences if present.
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            result: dict[str, Any] = json.loads(raw)

            use_tool = result.get("use_tool", False)
            tool_name = result.get("tool_name")
            tool_args = result.get("tool_args", {})

            # Validate tool name exists.
            if use_tool and tool_name:
                valid_names = {t.name for t in tools}
                if tool_name not in valid_names:
                    logger.warning(
                        f"[{state.get('user_phone')}] tool_decider: "
                        f"unknown tool '{tool_name}' — skipping tool call"
                    )
                    use_tool = False
                    tool_name = None
                    tool_args = None

            logger.info(
                f"[{state.get('user_phone')}] tool_decider: "
                f"use_tool={use_tool}"
                f"{f' tool={tool_name}' if tool_name else ''}"
            )

            return {
                "should_use_tool": use_tool,
                "tool_name": tool_name if use_tool else None,
                "tool_args": tool_args if use_tool else None,
            }

        except (json.JSONDecodeError, KeyError) as exc:
            logger.warning(
                f"[{state.get('user_phone')}] tool_decider: "
                f"JSON parse failed ({exc}) — skipping tool call"
            )
            return {
                "should_use_tool": False,
                "tool_name": None,
                "tool_args": None,
            }

        except Exception as exc:
            logger.error(
                f"[{state.get('user_phone')}] tool_decider error: {exc}"
            )
            return {
                "should_use_tool": False,
                "tool_name": None,
                "tool_args": None,
            }

    return tool_decider_node
