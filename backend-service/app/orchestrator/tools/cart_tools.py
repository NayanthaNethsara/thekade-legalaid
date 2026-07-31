"""Local tools for managing the conversation's shopping cart.

Each cart is scoped to the chat thread (``kind:id:conversation_id``), so the
cart the agent reads and writes is the same one the web UI shows for that
conversation. The thread id and principal kind come from the run config -- never
from anything the model supplies.
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.repositories.cart_repository import CartRepository
from app.schemas.cart import CartItem


def _get_cart_context(config: RunnableConfig) -> tuple[str, str] | None:
    """Return ``(cart_key, principal_kind)`` from the run config, or None.

    The cart key is the chat thread id, which scopes the cart to one
    conversation of one principal.
    """
    configurable = (config or {}).get("configurable") or {}
    cart_key = configurable.get("thread_id")
    principal_kind = configurable.get("principal_kind")
    if isinstance(cart_key, str) and cart_key and isinstance(principal_kind, str):
        return cart_key, principal_kind
    return None


def build_cart_tools(cart_repo: CartRepository) -> list[BaseTool]:
    @tool
    async def get_cart(config: RunnableConfig) -> str:
        """Show the customer's current shopping cart, including all items, their quantities,
        and the total price.

        Use this to check what items the user has added to their cart.
        """
        context = _get_cart_context(config)
        if not context:
            return "Unable to access cart. User context is missing."

        cart_key, _ = context
        cart = await cart_repo.get_cart(cart_key)

        if not cart.items:
            return "The cart is currently empty."

        items_str = "\\n".join(
            f"- {item.quantity}x {item.name} "
            f"(Product ID: {item.product_id}) at Rs {item.price} each"
            for item in cart.items
        )
        return f"Cart Items:\\n{items_str}\\n\\nTotal Price: Rs {cart.total_price}"

    @tool
    async def add_to_cart(
        product_id: str,
        name: str,
        price: float,
        quantity: int,
        image_url: str,
        config: RunnableConfig,
    ) -> str:
        """Add an item to the customer's shopping cart.

        Use this when the customer asks to add a specific product to their cart.
        Always verify the product details from MCP tools before adding, and pass
        the product's image_url from those results so the cart shows its picture.
        """
        context = _get_cart_context(config)
        if not context:
            return "Unable to access cart. User context is missing."

        cart_key, principal_kind = context
        item = CartItem(
            product_id=product_id,
            name=name,
            price=price,
            quantity=quantity,
            image_url=image_url or None,
        )

        await cart_repo.add_item(cart_key, principal_kind, item)
        return f"Added {quantity}x {name} to the cart."

    @tool
    async def remove_from_cart(product_id: str, config: RunnableConfig) -> str:
        """Remove a specific item from the customer's shopping cart.

        Use this when the customer asks to remove an item from their cart.
        """
        context = _get_cart_context(config)
        if not context:
            return "Unable to access cart. User context is missing."

        cart_key, principal_kind = context
        await cart_repo.remove_item(cart_key, principal_kind, product_id)
        return f"Removed product {product_id} from the cart."

    @tool
    async def change_cart_item(product_id: str, quantity: int, config: RunnableConfig) -> str:
        """Update the quantity of an item already in the shopping cart.

        Use this if the customer wants to change how many of a specific item they want.
        If quantity is 0, use remove_from_cart instead.
        """
        if quantity <= 0:
            result = await remove_from_cart.ainvoke({"product_id": product_id}, config)
            return str(result)

        context = _get_cart_context(config)
        if not context:
            return "Unable to access cart. User context is missing."

        cart_key, principal_kind = context
        await cart_repo.update_item(cart_key, principal_kind, product_id, quantity)
        return f"Updated quantity for product {product_id} to {quantity}."

    @tool
    async def clear_cart(config: RunnableConfig) -> str:
        """Empty the customer's shopping cart completely.

        Use this when the customer wants to start over or empty their cart.
        """
        context = _get_cart_context(config)
        if not context:
            return "Unable to access cart. User context is missing."

        cart_key, _ = context
        await cart_repo.clear_cart(cart_key)
        return "The cart has been emptied."

    return [get_cart, add_to_cart, remove_from_cart, change_cart_item, clear_cart]
