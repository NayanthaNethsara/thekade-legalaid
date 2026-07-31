"""Dynamic prompt context assembled from turn state.

The agents and the response generator both need the same picture of the turn --
date, customer profile, running summary, cart, what was shown recently, and the
planner's guidance. Building it in one place keeps the two prompts in sync.
"""

import datetime

from app.orchestrator.constants import SL_TIMEZONE
from app.orchestrator.state import AgentState
from app.orchestrator.utils.products import recent_shown_products
from app.orchestrator.utils.turns import message_text


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
    if cart := state.get("cart", ""):
        sections.append(f"Current Cart:\n{cart}")
    last_msg = message_text(state["messages"][-1]).lower() if state.get("messages") else ""
    if state.get("is_ui", False) and "checkout form" in last_msg:
        sections.append(
            "UI CHECKOUT STATUS: The customer has submitted and explicitly confirmed "
            "all order details via the UI form. Treat this as an explicit confirmation. "
            "Skip any validation, read-back, or confirmation questions, and call "
            "kakille_create_order immediately."
        )
    if shown := recent_shown_products(state.get("rendered_turns", [])):
        sections.append(
            "Products shown to the customer in recent turns, in display order. "
            'Resolve positional references ("the 2nd one") and product names '
            "against this list, then use the matching product_id:\n"
            f"{shown}"
        )
    if plan := state.get("plan", ""):
        sections.append(
            f"Turn guidance from the planner (adapt naturally, never copy wording):\n{plan}"
        )
    return sections
