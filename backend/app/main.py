from fastapi import FastAPI
from app.api import whatsapp

app = FastAPI()

app.include_router(whatsapp.router)
