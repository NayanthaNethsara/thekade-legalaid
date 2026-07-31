"""Derive order state from the turn's kakille_create_order calls,
so checkout records stay exact and the Redis cache is updated when they run."""

import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from app.orchestrator.utils.turns import current_turn_messages, message_text

CREATE_ORDER_TOOL = "kakille_create_order"

_ORDER_REF = re.compile(r'"order_ref"\s*:\s*"([^"]+)"')
_ORDER_REF_BARE = re.compile(r"\bORD-\d{8}-[A-Za-z0-9]+\b")
_EXPIRES_AT = re.compile(r"(?i)expires\s+at\s+([A-Za-z0-9_\-\+\:]+)")
_ORDER_LINK = re.compile(r"https?://[^\s\)]+continue_order[^\s\)]+")


@dataclass
class CheckoutEvent:
    order_ref: str
    summary: str
    expires_at: str | None
    last_order: dict[str, Any]
    order_link: str | None = None


def extract_checkout_events(
    messages: Sequence[BaseMessage],
) -> list[CheckoutEvent]:
    """Pull checkout events from the current turn's order creation tool."""
    turn = current_turn_messages(messages)
    args_by_id = _tool_args_by_id(turn)

    checkouts: list[CheckoutEvent] = []

    for message in turn:
        if not isinstance(message, ToolMessage):
            continue
        text = message_text(message)
        if _is_error(text):
            continue
        args = args_by_id.get(message.tool_call_id, {})

        if message.name == CREATE_ORDER_TOOL:
            checkout = _checkout_from(text, args)
            if checkout is not None:
                checkouts.append(checkout)

    return checkouts


def _checkout_from(text: str, args: dict[str, Any]) -> CheckoutEvent | None:
    order_ref = _search(_ORDER_REF, text) or _search(_ORDER_REF_BARE, text, group=0)
    if not order_ref:
        return None
    order_link = _search(_ORDER_LINK, text, group=0)
    return CheckoutEvent(
        order_ref=order_ref,
        summary=_checkout_summary(args),
        expires_at=_search(_EXPIRES_AT, text),
        last_order=args,
        order_link=order_link,
    )


def _checkout_summary(args: dict[str, Any]) -> str:
    cart = args.get("cart") or []
    delivery = args.get("delivery") or {}
    parts: list[str] = []
    if isinstance(cart, list) and cart:
        parts.append(f"{len(cart)} item(s)")
    city = delivery.get("city") if isinstance(delivery, dict) else None
    if city:
        parts.append(f"to {city}")
    date = delivery.get("date") if isinstance(delivery, dict) else None
    if date:
        parts.append(f"delivery {date}")
    return ", ".join(parts)


def _tool_args_by_id(messages: Sequence[BaseMessage]) -> dict[str, dict[str, Any]]:
    args_by_id: dict[str, dict[str, Any]] = {}
    for message in messages:
        if not isinstance(message, AIMessage):
            continue
        for call in message.tool_calls or []:
            call_id = call.get("id")
            if call_id:
                raw_args = call.get("args") or {}
                if "params" in raw_args and isinstance(raw_args["params"], dict):
                    args_by_id[call_id] = raw_args["params"]
                else:
                    args_by_id[call_id] = raw_args
    return args_by_id


def _search(pattern: re.Pattern[str], text: str, group: int = 1) -> str | None:
    match = pattern.search(text)
    return match.group(group).strip() if match else None


def _is_error(text: str) -> bool:
    # Order tool reports failures as "Error: ..." or "Error (<code>): ...".
    return text.lstrip().startswith("Error")
