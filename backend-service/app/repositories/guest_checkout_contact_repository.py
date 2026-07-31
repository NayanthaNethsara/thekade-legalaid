import json

from redis.asyncio import Redis

from app.repositories.customer_profile_repository import CustomerProfileData


class GuestCheckoutContactRepository:
    """Per-chat checkout contact details (name, phone, address) for guests.

    Guests have no durable identity, so their checkout details are scoped to the
    chat thread and live only in Redis with the guest cart's TTL: they age out on
    their own and are never linked across chats or to a person. This lets the agent
    avoid re-asking the same details within a conversation without retaining guest
    PII. Preferences are deliberately not stored -- only what checkout needs.
    """

    _KEY_PREFIX = "guest_contact:"
    _TTL_SECONDS = 24 * 60 * 60  # mirrors the guest cart lifetime

    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    def _key(self, thread_id: str) -> str:
        return f"{self._KEY_PREFIX}{thread_id}"

    async def get(self, thread_id: str) -> CustomerProfileData | None:
        raw = await self._redis.get(self._key(thread_id))
        if raw is None:
            return None
        try:
            data = json.loads(raw)
        except (ValueError, TypeError):
            return None
        return CustomerProfileData(
            name=data.get("name"),
            phone=data.get("phone"),
            addresses=data.get("addresses", []),
        )

    async def save(self, thread_id: str, data: CustomerProfileData) -> None:
        payload = json.dumps({"name": data.name, "phone": data.phone, "addresses": data.addresses})
        await self._redis.set(self._key(thread_id), payload, ex=self._TTL_SECONDS)
