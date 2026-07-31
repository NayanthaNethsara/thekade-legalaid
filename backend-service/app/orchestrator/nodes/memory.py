import re
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_config

from app.core.logging import get_logger
from app.core.security.phone import to_local_display
from app.orchestrator.prompts import COMBINED_MEMORY_EXTRACT_PROMPT
from app.orchestrator.state import AgentState
from app.orchestrator.utils.order_sync import CheckoutEvent, extract_checkout_events
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import (
    render_last_exchanges,
    render_llm_input,
)
from app.repositories.cart_checkout_repository import CartCheckoutRepository
from app.repositories.customer_memory_repository import CustomerMemoryRepository
from app.repositories.customer_profile_repository import (
    CustomerProfileData,
    CustomerProfileRepository,
)
from app.repositories.guest_checkout_contact_repository import GuestCheckoutContactRepository
from app.repositories.order_tracking_repository import OrderTrackingRepository
from app.schemas.memory import CombinedExtraction

logger = get_logger(__name__)

_EXCHANGE_WINDOW = 3


def _user_identity() -> str | None:
    configurable = get_config().get("configurable") or {}
    identity = configurable.get("user_identity")
    return identity if isinstance(identity, str) and identity else None


def _whatsapp_number_line(channel: str | None, identity: str | None) -> str | None:
    """A profile line carrying the WhatsApp number the customer is messaging from.

    On WhatsApp the identity is the canonical phone, so we surface it as part of the
    loaded profile -- the checkout flow then treats it like any known contact number
    instead of asking for one. Web accounts have no such number.
    """
    if channel != "whatsapp" or not identity:
        return None
    return f"WhatsApp number (the number they are messaging from): {to_local_display(identity)}"


async def load_memory(
    state: AgentState,
    *,
    profile_repo: CustomerProfileRepository,
    memory_repo: CustomerMemoryRepository,
    cart_repo: Any,
    guest_contact_repo: GuestCheckoutContactRepository,
) -> dict[str, Any]:
    node_start("LOAD MEMORY NODE")

    identity = _user_identity()
    configurable = get_config().get("configurable") or {}
    thread_id = configurable.get("thread_id")

    update: dict[str, Any] = {}

    if thread_id:
        try:
            cart = await cart_repo.get_cart(thread_id)
            if cart and cart.items:
                cart_lines = [
                    f"{item.quantity}x {item.name} (ID: {item.product_id}) - Rs {item.price}"
                    for item in cart.items
                ]
                update["cart"] = "\n".join(cart_lines)
            else:
                update["cart"] = "Cart is empty."
        except Exception as e:
            logger.warning("orchestrator.memory.load_cart_failed", error=str(e))
            update["cart"] = "Cart is empty."

    if not identity:
        if thread_id:
            guest_contact = await guest_contact_repo.get(thread_id)
            if guest_contact and (contact_text := guest_contact.to_prompt_text()):
                update["memory"] = contact_text
        node_finish(
            "LOAD MEMORY NODE",
            Identity="guest",
            Cart=update.get("cart", "n/a"),
            Memory="loaded" if update.get("memory") else "none",
        )
        return update

    profile, memory_data = (
        await profile_repo.get(identity),
        await memory_repo.get(identity),
    )

    sections: list[str] = []
    if whatsapp_line := _whatsapp_number_line(state.get("channel"), identity):
        sections.append(whatsapp_line)
    if profile:
        profile_text = profile.to_prompt_text()
        if profile_text:
            sections.append(profile_text)
    if memory_data:
        try:
            parsed_memory = CombinedExtraction(**memory_data)
            memory_text = parsed_memory.to_formatted_text()
            if memory_text:
                sections.append(f"Preferences:\n{memory_text}")
        except Exception as e:
            logger.warning(
                "orchestrator.memory.load_failed_parsing",
                identity=identity,
                error=str(e),
            )

    combined = "\n\n".join(sections)
    if combined:
        update["memory"] = combined

    node_finish(
        "LOAD MEMORY NODE",
        Identity=identity,
        Cart=update.get("cart", "n/a"),
        Memory="loaded" if combined else "none",
    )
    return update


async def write_memory(
    state: AgentState,
    *,
    user_identity: str | None,
    thread_id: str | None,
    model: BaseChatModel,
    profile_repo: CustomerProfileRepository,
    memory_repo: CustomerMemoryRepository,
    guest_contact_repo: GuestCheckoutContactRepository,
    cart_checkout_repo: CartCheckoutRepository,
    order_tracking_repo: OrderTrackingRepository,
) -> dict[str, Any]:
    node_start("WRITE MEMORY NODE")

    identity = user_identity
    exchange = render_last_exchanges(state["messages"], _EXCHANGE_WINDOW)

    if not identity:
        saved = await _write_guest_contact(state, thread_id, exchange, model, guest_contact_repo)
        node_finish(
            "WRITE MEMORY NODE",
            Identity="guest",
            Contact="saved" if saved else "unchanged",
        )
        return {}

    if not exchange:
        node_finish("WRITE MEMORY NODE", Identity=identity, Note="no exchange")
        return {}

    existing_profile = await profile_repo.get(identity) or CustomerProfileData()
    should_extract = state.get("requires_memory_update", False)
    profile_updated = False
    memory_updated = False
    tracking_changes = 0

    tracking_details = state.get("tracking") or []
    for t in tracking_details:
        track_num = t.get("order_number")
        if not track_num:
            continue
        status_text = str(t.get("status", "")).lower()
        is_terminal = bool(
            re.search(r"\bcancelled\b", status_text)
            or re.search(r"\b(?<!un)delivered\b", status_text)
        )
        status = "delivered/cancelled" if is_terminal else "tracking"
        if await order_tracking_repo.record_tracking(identity, track_num, status):
            tracking_changes += 1

    if should_extract:
        existing_memory_data = await memory_repo.get(identity) or {}
        existing_memory_obj = (
            CombinedExtraction(**existing_memory_data)
            if existing_memory_data
            else CombinedExtraction()
        )
        existing_memory_text = existing_memory_obj.to_formatted_text()

        extracted = await _extract_combined(
            model=model,
            exchange=exchange,
            existing_profile=existing_profile,
            existing_memory=existing_memory_text,
        )
        if extracted:
            profile_data = CustomerProfileData(
                name=extracted.name,
                phone=extracted.phone,
                addresses=[{"label": a.label, "value": a.value} for a in extracted.addresses],
            )
            profile_updated = await profile_repo.upsert_profile(identity, profile_data)

            new_memory_dict = extracted.to_memory_dict()
            if new_memory_dict != existing_memory_obj.to_memory_dict():
                await memory_repo.upsert(identity, new_memory_dict)
                memory_updated = True

    raw_checkouts = state.get("_checkout_events")
    if raw_checkouts is None:
        checkouts = extract_checkout_events(state["messages"])
    else:
        checkouts = [
            c if isinstance(c, CheckoutEvent) else CheckoutEvent(**c) for c in raw_checkouts
        ]

    for checkout in checkouts:
        cart_list = checkout.last_order.get("cart") or []
        await cart_checkout_repo.record_checkout(
            identity,
            checkout_ref=checkout.order_ref,
            summary=checkout.summary,
            expires_at=checkout.expires_at,
            order_link=checkout.order_link,
            cart=cart_list,
        )

    node_finish(
        "WRITE MEMORY NODE",
        Identity=identity,
        Profile="updated" if profile_updated else "unchanged",
        Memory="updated" if memory_updated else "unchanged",
        Tracking=f"{tracking_changes} changed" if tracking_changes else "unchanged",
        Checkouts=len(checkouts),
    )
    return {}


async def _write_guest_contact(
    state: AgentState,
    thread_id: str | None,
    exchange: str,
    model: BaseChatModel,
    guest_contact_repo: GuestCheckoutContactRepository,
) -> bool:
    if not thread_id or not exchange or state.get("target_goal") != "checkout":
        return False

    existing = await guest_contact_repo.get(thread_id) or CustomerProfileData()
    extracted = await _extract_combined(
        model=model,
        exchange=exchange,
        existing_profile=existing,
        existing_memory="",
    )
    if not extracted:
        return False

    merged = _merged_guest_contact(existing, extracted)
    if merged == existing:
        return False
    await guest_contact_repo.save(thread_id, merged)
    return True


def _merged_guest_contact(
    existing: CustomerProfileData, extracted: CombinedExtraction
) -> CustomerProfileData:
    addresses = [dict(a) for a in existing.addresses]
    seen = {a.get("value", "").strip().lower() for a in addresses}
    for addr in extracted.addresses:
        value = addr.value.strip()
        if value and value.lower() not in seen:
            addresses.append({"label": addr.label or "default", "value": value})
            seen.add(value.lower())
    return CustomerProfileData(
        name=extracted.name or existing.name,
        phone=extracted.phone or existing.phone,
        addresses=addresses,
    )


async def _extract_combined(
    model: BaseChatModel,
    exchange: str,
    existing_profile: CustomerProfileData,
    existing_memory: str,
) -> CombinedExtraction | None:
    system_prompt = COMBINED_MEMORY_EXTRACT_PROMPT
    user_content = (
        f"Existing Profile contact details:\n{existing_profile.to_prompt_text() or '(none)'}\n\n"
        f"Existing Behavioral Preferences:\n{existing_memory or '(none)'}\n\n"
        f"Latest exchange:\n{exchange}"
    )
    prompt = [SystemMessage(content=system_prompt), HumanMessage(content=user_content)]
    logger.info("orchestrator.memory.extract_combined.input", llm_input=render_llm_input(prompt))

    structured_model = model.with_structured_output(CombinedExtraction)
    try:
        response = await structured_model.ainvoke(prompt)
        logger.info("orchestrator.memory.extract_combined.output", raw=str(response))
        if isinstance(response, CombinedExtraction):
            return response
    except Exception as e:
        logger.exception("orchestrator.memory.extract_combined.failed", error=str(e))
    return None
