from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.note import NoteCreate, NoteRead
from app.services.note_service import NoteService
from app.database.database import get_db

router = APIRouter()

@router.post("/notes", response_model=NoteRead)
async def create_note(note: NoteCreate, db: AsyncSession = Depends(get_db)):
    return await NoteService.create_note(db, note.user_id, note.content)

@router.get("/notes/{user_id}", response_model=list[NoteRead])
async def get_notes(user_id: str, db: AsyncSession = Depends(get_db)):
    return await NoteService.get_user_notes(db, user_id)
