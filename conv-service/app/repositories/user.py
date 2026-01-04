from sqlalchemy.orm import Session
from app.models.user import User
from app.services.cache.user import UserCacheService
from typing import Optional

class UserRepository:
    def __init__(self, db: Session, cache: UserCacheService):
        self.db = db
        self.cache = cache

    async def get_by_phone_number(self, phone_number: str) -> Optional[User]:
        cached_data = await self.cache.get_user(phone_number)
        if cached_data:
            return User(**cached_data)

        user = self.db.query(User).filter(User.phone_number == phone_number).first()
        
        if user:
            user_data = {
                "id": user.id,
                "phone_number": user.phone_number,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            await self.cache.set_user(phone_number, user_data)
            
        return user

    async def create(self, phone_number: str) -> User:
        user = User(phone_number=phone_number)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        user_data = {
            "id": user.id,
            "phone_number": user.phone_number,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        await self.cache.set_user(phone_number, user_data)
        
        return user
