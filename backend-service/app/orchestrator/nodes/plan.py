import asyncio
import datetime
from typing import Any, Literal, cast

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.orchestrator.constants import (
    PLAN_TIMEOUT_SECONDS,
    SL_TIMEZONE,
    TITLE_MAX_CHARS,
)
from app.orchestrator.prompts import PERSONA_PROMPT, REFINE_AND_PLAN_PROMPT
from app.orchestrator.state import AgentState
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import (
    render_conversation_history,
    render_llm_input,
)

logger = get_logger(__name__)


class PlanResult(BaseModel):
    """Structured planner output. Semantics are documented in REFINE_AND_PLAN_PROMPT;
    field descriptions here carry only the value enums the schema must enforce."""

    detected_language: Literal["si", "ta", "en", "singlish", "tanglish", ""] = Field(
        default="", description="Language to reply in: si | ta | en | singlish | tanglish"
    )
    detected_emotion: Literal["sad", "stressed", "angry", "celebrating", "neutral"] = Field(
        default="neutral",
        description="One of: sad | stressed | angry | celebrating | neutral",
    )
    target_goal: Literal["search", "chat"] = Field(
        default="chat", description="One of: search | chat"
    )
    conversational_strategy: str = Field(default="")
    normalized_request: str = Field(default="")
    requires_memory_update: bool = Field(
        default=False,
        description="Set to true ONLY if the customer states a lasting "
        "preference or provides their own profile details.",
    )
    title: str = Field(
        default="",
        description="A descriptive conversation title (4 to 6 words, max 60 characters) "
        "summarizing the overall main topic/goal of the entire conversation. Keep it "
        "friendly, natural, and in the language of the conversation.",
    )

    @property
    def plan_text(self) -> str:
        lines = [
            f"Customer's main goal: {self.target_goal}",
            f"Their request: {self.normalized_request}",
        ]
        if self.conversational_strategy:
            lines.append(f"Guidance: {self.conversational_strategy}")
        return "\n".join(lines)

    def as_state_update(self) -> dict[str, Any]:
        update = {
            "plan": self.plan_text.strip(),
            "detected_emotion": self.detected_emotion.strip(),
            "target_goal": self.target_goal.strip(),
            "requires_memory_update": self.requires_memory_update,
        }
        if self.title:
            cleaned_title = self.title.strip("\"'`* \t")
            if cleaned_title:
                update["title"] = cleaned_title[:TITLE_MAX_CHARS]
        return update


def _build_plan_prompt(state: AgentState) -> list[Any]:
    today_str = datetime.datetime.now(SL_TIMEZONE).strftime("%Y-%m-%d (%A)")

    established_language = state.get("detected_language") or "none yet"
    parts = [
        f"Current Date: {today_str}",
        f"Language established for this conversation: {established_language}",
    ]
    if summary := state.get("summary", ""):
        parts.append(f"Summary of earlier conversation:\n{summary}")
    if memory := state.get("memory", ""):
        parts.append(f"Customer profile & preferences:\n{memory}")
    if recent_history := render_conversation_history(
        state["messages"], max_turns=6, include_tool_calls=True
    ):
        parts.append(f"Recent exchange:\n{recent_history}")

    system_content = (
        f"You are formulating a plan and strategy for the following persona:\n"
        f"--- PERSONA ---\n{PERSONA_PROMPT}\n---------------\n\n"
        f"{REFINE_AND_PLAN_PROMPT}"
    )
    return [
        SystemMessage(content=system_content),
        HumanMessage(content="\n\n".join(parts)),
    ]


async def plan(state: AgentState, *, model: BaseChatModel) -> dict[str, Any]:
    node_start("PLAN NODE")

    messages = _build_plan_prompt(state)
    logger.debug("orchestrator.plan.input", llm_input=render_llm_input(messages))

    # On planner failure, keep the prior turn's goal so a transient blip never
    # drops an active research thread into chat. Old checkpoints may carry a
    # goal from a removed agent, so anything unknown sanitizes to "chat".
    prior_goal = state.get("target_goal") or "chat"
    if prior_goal not in ("search", "chat"):
        prior_goal = "chat"
    result = PlanResult(target_goal=cast(Literal["search", "chat"], prior_goal))
    planner = model.with_structured_output(PlanResult)
    try:
        parsed = await asyncio.wait_for(planner.ainvoke(messages), timeout=PLAN_TIMEOUT_SECONDS)
        if isinstance(parsed, PlanResult):
            result = parsed
        else:
            logger.warning("orchestrator.plan.unstructured_output")
    except TimeoutError:
        logger.warning("orchestrator.plan.timeout", timeout=PLAN_TIMEOUT_SECONDS)
    except Exception as error:
        logger.exception("orchestrator.plan.failed", error=str(error))

    update = result.as_state_update()
    effective_language = result.detected_language or state.get("detected_language", "")
    update["detected_language"] = effective_language

    logger.info(
        "orchestrator.plan.parsed",
        target_goal=result.target_goal,
        detected_language=result.detected_language,
        effective_language=effective_language,
        detected_emotion=result.detected_emotion,
        strategy=result.conversational_strategy,
        requires_memory_update=update.get("requires_memory_update", False),
    )
    logger.debug(
        "orchestrator.plan.parsed_detail",
        normalized_request=result.normalized_request,
    )

    node_finish(
        "PLAN NODE",
        Goal=result.target_goal,
        Language=effective_language,
        Emotion=result.detected_emotion,
        Strategy=result.conversational_strategy,
    )

    return update
