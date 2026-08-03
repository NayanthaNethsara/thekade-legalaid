"""Dynamic prompt context assembled from turn state.

Every agent needs the same picture of the turn -- date, customer profile,
running summary, the user's selected sources, and the planner's guidance.
Building it in one place keeps the prompts in sync.
"""

import datetime

from app.orchestrator.constants import SL_TIMEZONE
from app.orchestrator.state import AgentState


def build_state_context(state: AgentState) -> list[str]:
    """Prompt sections derived from live turn state, in priority order.

    Omits sections with no content so the prompt stays lean. Static persona and
    operating rules are the caller's concern; this is only the dynamic state.
    """
    today = datetime.datetime.now(SL_TIMEZONE).strftime("%Y-%m-%d (%A)")
    sections = [f"Current Date: {today}"]

    if memory := state.get("memory", ""):
        sections.append(f"Customer profile:\n{memory}")
    if summary := state.get("summary", ""):
        sections.append(f"Summary of earlier conversation:\n{summary}")
    if sources_context := state.get("sources_context", ""):
        sections.append(sources_context)
    if plan := state.get("plan", ""):
        sections.append(
            f"Turn guidance from the planner (adapt naturally, never copy wording):\n{plan}"
        )
    return sections
