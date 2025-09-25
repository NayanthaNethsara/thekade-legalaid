from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings


class DatabaseManager:
    def __init__(self):
        self.mongodb_client: Optional[AsyncIOMotorClient] = None
        self.mongodb_db = None
        self.redis_client: Optional[redis.Redis] = None

    async def connect_mongodb(self):
        """Initialize MongoDB connection"""
        try:
            self.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.mongodb_db = self.mongodb_client[settings.MONGODB_DB_NAME]
            # Test connection
            await self.mongodb_client.admin.command('ping')
            print(f"✅ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            raise e

    async def connect_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL, 
                db=settings.REDIS_DB,
                decode_responses=True
            )
            # Test connection
            await self.redis_client.ping()
            print(f"✅ Connected to Redis: {settings.REDIS_URL}")
        except Exception as e:
            print(f"❌ Failed to connect to Redis: {e}")
            raise e

    async def disconnect_mongodb(self):
        """Close MongoDB connection"""
        if self.mongodb_client:
            self.mongodb_client.close()
            print("📤 Disconnected from MongoDB")

    async def disconnect_redis(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            print("📤 Disconnected from Redis")

    async def get_mongodb_collection(self, collection_name: str):
        """Get MongoDB collection"""
        if not self.mongodb_db:
            raise Exception("MongoDB not connected")
        return self.mongodb_db[collection_name]

    async def get_redis_client(self):
        """Get Redis client"""
        if not self.redis_client:
            raise Exception("Redis not connected")
        return self.redis_client


# Global database manager instance
db_manager = DatabaseManager()


# Dependency functions for FastAPI
async def get_mongodb_collection(collection_name: str):
    return await db_manager.get_mongodb_collection(collection_name)


async def get_redis_client():
    return await db_manager.get_redis_client()