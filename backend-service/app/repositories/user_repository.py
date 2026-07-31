import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """The only layer that queries the users table.

    Returns ORM models and owns no business rules; the service decides what to
    do with them. Mutations are staged on the session and committed by the
    caller so a single request can span several writes atomically.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self._session.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_by_firebase_uid(self, firebase_uid: str) -> User | None:
        result = await self._session.execute(select(User).where(User.firebase_uid == firebase_uid))
        return result.scalar_one_or_none()

    def add(self, user: User) -> None:
        self._session.add(user)

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, user: User) -> None:
        await self._session.refresh(user)
