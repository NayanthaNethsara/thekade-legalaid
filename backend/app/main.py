from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(debug=settings.DEBUG)

@app.get("/test")
def test():
    return {
        "debug": settings.DEBUG,
        "api": settings.WHATSAPP_API
    }
