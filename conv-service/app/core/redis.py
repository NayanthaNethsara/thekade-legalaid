from typing import Any, Optional

from redis.asyncio import ConnectionPool, Redis

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class RedisClient:
    _instance: Optional['RedisClient'] = None

    def __init__(self):
        self.pool = ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
        self.redis = Redis(connection_pool=self.pool)
        logger.info("Redis client initialized")

    @classmethod
    def get_instance(cls) -> 'RedisClient':
        if cls._instance is None:
            cls._instance = RedisClient()
        return cls._instance

    async def close(self):
        await self.redis.close()
        await self.pool.disconnect()
        logger.info("Redis client closed")

    async def get(self, key: str) -> Optional[str]:
        return await self.redis.get(key)

    async def set(self, key: str, value: Any, ex: Optional[int] = None):
        await self.redis.set(key, value, ex=ex)

    async def hget(self, name: str, key: str) -> Optional[str]:
        return await self.redis.hget(name, key)

    async def hset(self, name: str, key: str, value: Any):
        await self.redis.hset(name, key, value)

    async def hdel(self, name: str, key: str):
        await self.redis.hdel(name, key)

    async def lpush(self, name: str, *values: Any):
        await self.redis.lpush(name, *values)

    async def lrange(self, name: str, start: int, end: int) -> list[str]:
        values = await self.redis.lrange(name, start, end)
        return list(values)

    async def ltrim(self, name: str, start: int, end: int):
        await self.redis.ltrim(name, start, end)

    async def expire(self, name: str, seconds: int):
        await self.redis.expire(name, seconds)
