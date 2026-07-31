import json
from typing import Any, cast

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.customer_memory import CustomerMemory

_CACHE_TTL_SECONDS = 3600
_CACHE_KEY_PREFIX = "customer_memory:"


class CustomerMemoryRepository:
    """Read and write the LLM-managed behavioural preference structured JSON.

    Redis is the read cache (TTL 1 h). Postgres is the source of truth.
    """

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession], redis: Redis) -> None:
        self._sessionmaker = sessionmaker
        self._redis = redis

    async def get(self, identity: str) -> dict[str, Any] | None:
        cache_key = f"{_CACHE_KEY_PREFIX}{identity}"
        # The client is created with decode_responses=True, so values are str.
        cached = cast(str | None, await self._redis.get(cache_key))
        if cached is not None:
            try:
                return json.loads(cached) if cached else None
            except (json.JSONDecodeError, TypeError):
                return None

        async with self._sessionmaker() as session:
            row = await session.scalar(
                select(CustomerMemory).where(CustomerMemory.user_identity == identity)
            )

        if row is None or not row.memory:
            return None

        await self._redis.setex(cache_key, _CACHE_TTL_SECONDS, json.dumps(row.memory))
        return row.memory

    async def upsert(self, identity: str, memory_data: dict[str, Any]) -> None:
        async with self._sessionmaker() as session:
            row = await session.get(CustomerMemory, identity)
            if row is None:
                session.add(CustomerMemory(user_identity=identity, memory=memory_data))
            else:
                row.memory = memory_data
            await session.commit()

        await self._redis.setex(
            f"{_CACHE_KEY_PREFIX}{identity}", _CACHE_TTL_SECONDS, json.dumps(memory_data)
        )

    async def clear(self, identity: str) -> None:
        async with self._sessionmaker() as session:
            row = await session.get(CustomerMemory, identity)
            if row is not None:
                await session.delete(row)
                await session.commit()
        await self._redis.delete(f"{_CACHE_KEY_PREFIX}{identity}")
