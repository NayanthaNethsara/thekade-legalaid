from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres import SessionLocal
from app.services.auth_service import AuthService
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserRead

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model=UserRead)
def register(user: UserCreate, db: Session = Depends(get_db)):
    service = AuthService(UserRepository(db))
    try:
        return service.register_user(user.email, user.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    service = AuthService(UserRepository(db))
    try:
        token = service.login_user(user.email, user.password)
        return {"access_token": token, "token_type": "bearer"}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
