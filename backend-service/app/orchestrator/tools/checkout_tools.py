import json

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.orchestrator.tools.common import _identity
from app.repositories.cart_checkout_repository import CartCheckoutRepository

_HISTORY_LIMIT = 3


def build_active_checkouts_tool(cart_checkout_repo: CartCheckoutRepository) -> BaseTool:
    @tool
    async def get_active_checkouts(config: RunnableConfig) -> str:
        """Retrieve the customer's currently active (non-expired) Kakille checkout
        links with their cart contents and payment URLs.

        Use this when the customer asks about their pending checkout, wants to
        continue a payment, or asks for a checkout link they recently generated.
        """
        identity = _identity(config)
        if not identity:
            return "No active checkouts available for this customer."
        active = await cart_checkout_repo.get_active(identity)
        if not active:
            return "This customer has no active checkout links."
        lines = [o.to_prompt_line() for o in active]
        return "\n".join(lines)

    return get_active_checkouts


def build_checkout_history_tool(cart_checkout_repo: CartCheckoutRepository) -> BaseTool:
    @tool
    async def get_checkout_history(config: RunnableConfig) -> str:
        """Show this customer's most recent Kakille cart checkout history (up to 3),
        newest first.

        Use it when the customer asks what they ordered before or wants to recall
        past checkout items. For live shipping status, use kakille_track_order
        with the tracking ID (starts with VIMP) instead.
        """
        identity = _identity(config)
        if not identity:
            return "No checkout history is available for this customer."
        checkouts = await cart_checkout_repo.get_checkout_history_db(identity)
        if not checkouts:
            return "This customer has no recorded checkouts."

        lines = []
        for c in checkouts[:_HISTORY_LIMIT]:
            date_str = c.created_at.strftime("%Y-%m-%d") if c.created_at else "unknown date"
            cart_details = f"\n  {json.dumps(c.cart)}" if c.cart else " (No item details)"
            lines.append(f"- Checkout from {date_str}:{cart_details}")
        return "\n".join(lines)

    return get_checkout_history


def build_last_checkout_tool(cart_checkout_repo: CartCheckoutRepository) -> BaseTool:
    @tool
    async def get_last_checkout(config: RunnableConfig) -> str:
        """Retrieve details and cart items of this customer's very last cart checkout.

        Use this when the customer asks to repeat their last order, place the same
        order again, or asks what was in their last checkout.
        """
        identity = _identity(config)
        if not identity:
            return "No checkout history is available for this customer."
        last_checkout = await cart_checkout_repo.get_last_checkout_cart(identity)
        if not last_checkout:
            return "This customer has no recorded previous checkouts."
        return json.dumps(last_checkout)

    return get_last_checkout
