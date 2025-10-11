from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.note import Note

class NoteRepository:

    @staticmethod
    async def create(db: AsyncSession, user_id: str, content: str):
        note = Note(user_id=user_id, content=content)
        db.add(note)
        await db.commit()
        await db.refresh(note)
        return note

    @staticmethod
    async def get_by_user(db: AsyncSession, user_id: str):
        result = await db.execute(select(Note).where(Note.user_id == user_id))
        return result.scalars().all()
