from fastapi import APIRouter
from app.core.config import settings


router = APIRouter()

@router.get("/hello")
async def say_hello():
    return {"message": "Hello, World!"}

@router.get("/show-secret")
async def show_secret():
    # Just to test if .env is loaded
    return {"secret_key": settings.SECRET_KEY}