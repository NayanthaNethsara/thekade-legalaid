from redis.asyncio import Redis

from app.schemas.guest import GuestRecord


class GuestRepository:
    """The only layer that touches Redis for guest sessions.

    Guests live under `guest:{id}` as a JSON blob with a TTL, so expiry is
    Redis's job and no cleanup task is needed.
    """

    _KEY_PREFIX = "guest:"

    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    def _key(self, guest_id: str) -> str:
        return f"{self._KEY_PREFIX}{guest_id}"

    async def create(self, guest: GuestRecord, ttl_seconds: int) -> None:
        await self._redis.set(self._key(guest.id), guest.model_dump_json(), ex=ttl_seconds)

    async def get(self, guest_id: str) -> GuestRecord | None:
        raw = await self._redis.get(self._key(guest_id))
        if raw is None:
            return None
        return GuestRecord.model_validate_json(raw)
