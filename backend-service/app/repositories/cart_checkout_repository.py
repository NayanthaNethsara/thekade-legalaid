import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import desc, select

from app.core.logging import get_logger
from app.models.cart_checkout import CustomerCartCheckout
from app.schemas.cart import CartItem

logger = get_logger(__name__)

_CACHE_TTL_SECONDS = 300  # 5 min cache
_CACHE_KEY_PREFIX = "customer_cart_checkouts:"

STATUS_LINK_GENERATED = "link_generated"
_ACTIVE_LIMIT = 5


@dataclass
class OrderData:
    checkout_ref: str
    summary: str
    order_link: str | None = None
    expires_at: str | None = None
    status: str = STATUS_LINK_GENERATED
    cart: list[dict[str, Any]] | None = None

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        deadline = _parse_iso(self.expires_at)
        return deadline is not None and deadline < datetime.now(UTC)

    @property
    def is_active(self) -> bool:
        return not self.is_expired

    def to_prompt_line(self) -> str:
        cart_info = f" | {json.dumps(self.cart)}" if self.cart else f" | {self.summary}"
        if self.is_expired:
            return f"  - {self.checkout_ref} (checkout link expired){cart_info}"
        link_str = f" | Link: {self.order_link}" if self.order_link else ""
        return f"  - {self.checkout_ref} (link generated){cart_info}{link_str}"


class CartCheckoutRepository:
    """Read and write per-customer Kakille checkouts.

    Redis caches the active checkouts (60 min TTL) under 'checkout_cart:{identity}:{checkout_ref}'.
    Cache is invalidated immediately on writes.
    """

    def __init__(self, sessionmaker: Any, redis: Redis) -> None:
        self._sessionmaker = sessionmaker
        self._redis = redis

    async def get_all(self, identity: str) -> list[OrderData]:
        cache_key = f"{_CACHE_KEY_PREFIX}{identity}"
        cached = await self._redis.get(cache_key)
        if cached is not None:
            try:
                return [OrderData(**item) for item in json.loads(cached)]
            except (ValueError, TypeError):
                pass

        orders = await self._get_checkout_orders(identity)
        await self._set_cache(identity, orders)
        return orders

    async def get_active(self, identity: str) -> list[OrderData]:
        active = [order for order in await self.get_all(identity) if order.is_active]
        return active[:_ACTIVE_LIMIT]

    async def record_checkout(
        self,
        identity: str,
        checkout_ref: str,
        summary: str,
        expires_at: str | None,
        order_link: str | None = None,
        cart: list[dict[str, Any]] | None = None,
    ) -> None:
        """Record a pre-payment checkout link in Redis and PostgreSQL database."""
        if not expires_at:
            expires_at = (datetime.now(UTC) + timedelta(minutes=60)).isoformat()

        ttl = 3600
        parsed_expiry = _parse_iso(expires_at)
        if parsed_expiry:
            remaining = (parsed_expiry - datetime.now(UTC)).total_seconds()
            if remaining > 0:
                ttl = int(remaining)

        key = f"checkout_cart:{identity}:{checkout_ref}"
        # Format and validate cart using CartItem DTO to ensure it matches exactly across the app
        formatted_cart = None
        if cart:
            formatted_cart = []
            for item in cart:
                try:
                    product_id = str(
                        item.get("product_id")
                        or item.get("code")
                        or item.get("productid")
                        or "unknown"
                    )
                    name = str(item.get("name") or "unknown")
                    price = float(item.get("price") or 0.0)
                    qty = int(item.get("quantity") or item.get("qty") or item.get("qunityr") or 1)
                    image_url = item.get("image_url") or item.get("imageurl")

                    c_item = CartItem(
                        product_id=product_id,
                        name=name,
                        price=price,
                        quantity=qty,
                        image_url=image_url if isinstance(image_url, str) else None,
                    )
                    formatted_cart.append(c_item.model_dump(exclude_none=True))
                except Exception as e:
                    logger.warning("cart_checkout_repo.invalid_cart_item", item=item, error=str(e))

        payload = json.dumps(
            {
                "checkout_ref": checkout_ref,
                "summary": summary,
                "order_link": order_link,
                "expires_at": expires_at,
                "status": STATUS_LINK_GENERATED,
                "cart": formatted_cart,
            }
        )
        await self._redis.setex(key, ttl, payload)
        await self._invalidate_cache(identity)

        # Write to PostgreSQL (no idempotency, simple insert)
        async with self._sessionmaker() as session:
            row = CustomerCartCheckout(
                user_identity=identity,
                cart=formatted_cart,
            )
            session.add(row)
            await session.commit()

    async def get_last_checkout_cart(self, identity: str) -> dict[str, Any] | None:
        """Get the most recent checkout cart for the customer from PostgreSQL."""
        async with self._sessionmaker() as session:
            stmt = (
                select(CustomerCartCheckout)
                .where(CustomerCartCheckout.user_identity == identity)
                .order_by(desc(CustomerCartCheckout.created_at))
                .limit(1)
            )
            row = await session.scalar(stmt)
            if row and row.cart is not None:
                return {"cart": row.cart}
            return None

    async def get_checkout_history_db(self, identity: str) -> list[CustomerCartCheckout]:
        """Fetch past checkout records for this customer from PostgreSQL, newest first."""
        async with self._sessionmaker() as session:
            stmt = (
                select(CustomerCartCheckout)
                .where(CustomerCartCheckout.user_identity == identity)
                .order_by(desc(CustomerCartCheckout.created_at))
                .limit(20)
            )
            res = await session.scalars(stmt)
            return list(res.all())

    async def _get_checkout_orders(self, identity: str) -> list[OrderData]:
        pattern = f"checkout_cart:{identity}:*"
        keys = await self._redis.keys(pattern)
        if not keys:
            return []

        pipe = self._redis.pipeline()
        for key in keys:
            pipe.get(key)
        results = await pipe.execute()

        checkouts = []
        for raw in results:
            if raw:
                try:
                    data = json.loads(raw)
                    order_data = OrderData(**data)
                    if not order_data.is_expired:
                        checkouts.append(order_data)
                except (ValueError, TypeError):
                    pass
        return checkouts

    async def _set_cache(self, identity: str, orders: list[OrderData]) -> None:
        payload = json.dumps(
            [
                {
                    "checkout_ref": o.checkout_ref,
                    "summary": o.summary,
                    "order_link": o.order_link,
                    "expires_at": o.expires_at,
                    "status": o.status,
                    "cart": o.cart,
                }
                for o in orders
            ]
        )
        await self._redis.setex(f"{_CACHE_KEY_PREFIX}{identity}", _CACHE_TTL_SECONDS, payload)

    async def _invalidate_cache(self, identity: str) -> None:
        await self._redis.delete(f"{_CACHE_KEY_PREFIX}{identity}")


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
