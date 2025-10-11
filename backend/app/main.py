from fastapi import FastAPI
from app.api import whatsapp, note, auth

app = FastAPI(
    title="Legal Aid API",
    description="Legal Aid WhatsApp Bot with JWT Authentication",
    version="1.0.0"
)

# Authentication router
app.include_router(auth.router)

# Existing routers  
app.include_router(whatsapp.router)

# Notes router
app.include_router(note.router)
