from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.note_repo import NoteRepository

class NoteService:

    @staticmethod
    async def create_note(db: AsyncSession, user_id: str, content: str):
        return await NoteRepository.create(db, user_id, content)

    @staticmethod
    async def get_user_notes(db: AsyncSession, user_id: str):
        return await NoteRepository.get_by_user(db, user_id)
