from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.core.db import Base


class User(Base):
    """Maps to the existing users table created by conv-service migrations."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    phone_number = Column(String, nullable=False, unique=True, index=True)
    status = Column(String, nullable=False, server_default='guest')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
