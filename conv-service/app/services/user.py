from app.repositories.user import UserRepository
from app.repositories.redis.user import UserRedisRepository
from app.models.user import User
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self, user_repo: UserRepository, user_redis_repo: UserRedisRepository):
        self.user_repo = user_repo
        self.user_redis_repo = user_redis_repo

    async def get_user_by_phone(self, phone_number: str) -> Optional[User]:
        # Try cache first
        cached_data = await self.user_redis_repo.get_user(phone_number)
        if cached_data:
            return User(**cached_data)

        # Cache miss - DB lookup
        user = self.user_repo.get_by_phone_number(phone_number)
        
        if user:
            # Cache it
            user_data = {
                "id": user.id,
                "phone_number": user.phone_number,
                "status": getattr(user, "status", "guest") or "guest",
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            await self.user_redis_repo.set_user(phone_number, user_data)
            
        return user

    async def create_user(self, phone_number: str) -> User:
        user = self.user_repo.create(phone_number)
        
        # Cache it
        user_data = {
            "id": user.id,
            "phone_number": user.phone_number,
            "status": getattr(user, "status", "guest") or "guest",
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        await self.user_redis_repo.set_user(phone_number, user_data)
        
        return user
