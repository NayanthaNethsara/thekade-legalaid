import json
import time
from typing import Optional, Dict, Any
from app.core.redis import RedisClient
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class UserRedisRepository:
    def __init__(self, redis_client: RedisClient):
        self.redis = redis_client
        self.cache_key = "users_cache"
        self.ttl_seconds = 24 * 60 * 60  # 24 hours

    async def get_user(self, phone_number: str) -> Optional[Dict[str, Any]]:
        try:
            data_str = await self.redis.hget(self.cache_key, phone_number)
            if not data_str:
                logger.debug(f"Cache miss for {phone_number}")
                return None

            data = json.loads(data_str)
            expires_at = data.get("expires_at", 0)
            
            if time.time() > expires_at:
                logger.info(f"Cache expired for {phone_number}")
                await self.redis.hdel(self.cache_key, phone_number)
                return None

            logger.debug(f"Cache hit for {phone_number}")
            # Refresh TTL
            await self.set_user(phone_number, data["data"])
            
            return data["data"]
        except Exception as e:
            logger.error(f"UserRedisRepository get error: {e}")
            return None

    async def set_user(self, phone_number: str, user_data: Dict[str, Any]):
        try:
            expires_at = time.time() + self.ttl_seconds
            payload = {
                "data": user_data,
                "expires_at": expires_at
            }
            await self.redis.hset(self.cache_key, phone_number, json.dumps(payload))
        except Exception as e:
            logger.error(f"UserRedisRepository set error: {e}")
