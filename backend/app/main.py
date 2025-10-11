from fastapi import FastAPI
from app.api import whatsapp
from app.api import note

app = FastAPI()

# Existing routers
app.include_router(whatsapp.router)

# Notes router
app.include_router(note.router)
