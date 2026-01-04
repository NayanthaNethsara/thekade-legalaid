from sqlalchemy.orm import Session
from app.models.user import User
from typing import Optional

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_phone_number(self, phone_number: str) -> Optional[User]:
        return self.db.query(User).filter(User.phone_number == phone_number).first()

    def create(self, phone_number: str) -> User:
        user = User(phone_number=phone_number)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
