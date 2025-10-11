from pydantic import BaseModel

class NoteCreate(BaseModel):
    user_id: str
    content: str

class NoteRead(BaseModel):
    id: int
    user_id: str
    content: str

    class Config:
        orm_mode = True
