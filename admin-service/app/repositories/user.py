from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_paginated(self, limit: int = 20, offset: int = 0) -> list[User]:
        """Fetch users with pagination."""
        return self.db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    def count_users(self) -> int:
        """Count total users."""
        return self.db.query(User).count()

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Fetch a specific user."""
        return self.db.query(User).filter(User.id == user_id).first()

    def update_status(self, user: User, new_status: str) -> User:
        """Update a user's access status."""
        user.status = new_status
        self.db.commit()
        self.db.refresh(user)
        return user
