from redis.asyncio import Redis
from redis.asyncio.lock import Lock

from app.schemas.cart import Cart, CartItem


class CartRepository:
    """Read and write a per-conversation cart.

    Each cart is keyed by ``cart_key`` -- the chat thread id
    (``kind:id:conversation_id``), so a cart belongs to exactly one conversation
    of one principal. Redis stores the cart JSON blob; the TTL follows the
    principal kind: 7 days for users, 1 day for guests.
    """

    _KEY_PREFIX = "cart:"
    _LOCK_KEY_PREFIX = "cart:lock:"
    _USER_TTL_SECONDS = 7 * 24 * 60 * 60
    _GUEST_TTL_SECONDS = 24 * 60 * 60
    _LOCK_TIMEOUT_SECONDS = 5
    _LOCK_BLOCKING_TIMEOUT_SECONDS = 5

    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    def _key(self, cart_key: str) -> str:
        return f"{self._KEY_PREFIX}{cart_key}"

    def _get_ttl(self, principal_kind: str) -> int:
        return self._USER_TTL_SECONDS if principal_kind == "user" else self._GUEST_TTL_SECONDS

    def _lock(self, cart_key: str) -> Lock:
        return self._redis.lock(
            f"{self._LOCK_KEY_PREFIX}{cart_key}",
            timeout=self._LOCK_TIMEOUT_SECONDS,
            blocking_timeout=self._LOCK_BLOCKING_TIMEOUT_SECONDS,
        )

    async def get_cart(self, cart_key: str) -> Cart:
        raw = await self._redis.get(self._key(cart_key))
        if raw is None:
            return Cart()
        return Cart.model_validate_json(raw)

    async def _save_cart(self, cart_key: str, principal_kind: str, cart: Cart) -> None:
        ttl = self._get_ttl(principal_kind)
        await self._redis.set(self._key(cart_key), cart.model_dump_json(), ex=ttl)

    async def add_item(self, cart_key: str, principal_kind: str, item: CartItem) -> Cart:
        async with self._lock(cart_key):
            cart = await self.get_cart(cart_key)

            existing_item = next((i for i in cart.items if i.product_id == item.product_id), None)
            if existing_item:
                existing_item.quantity += item.quantity
            else:
                cart.items.append(item)

            await self._save_cart(cart_key, principal_kind, cart)
            return cart

    async def remove_item(self, cart_key: str, principal_kind: str, product_id: str) -> Cart:
        async with self._lock(cart_key):
            cart = await self.get_cart(cart_key)
            cart.items = [i for i in cart.items if i.product_id != product_id]
            await self._save_cart(cart_key, principal_kind, cart)
            return cart

    async def update_item(
        self, cart_key: str, principal_kind: str, product_id: str, quantity: int
    ) -> Cart:
        async with self._lock(cart_key):
            cart = await self.get_cart(cart_key)
            for i in cart.items:
                if i.product_id == product_id:
                    i.quantity = quantity
                    break
            await self._save_cart(cart_key, principal_kind, cart)
            return cart

    async def clear_cart(self, cart_key: str) -> None:
        await self._redis.delete(self._key(cart_key))
