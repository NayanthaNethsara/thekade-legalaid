from fastapi import FastAPI
from app.api.routes import auth
from app.api.routes.chatbot import router as chatbot_router
from app.services.rag.vectorstore import build_or_load_index  # 👈 add this
from app.core.logging import setup_logging


app = FastAPI()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chatbot_router, prefix="/api/v1")


# Optional: You can add startup events for DB or other services if needed
@app.on_event("startup")
async def startup_event():
    print("App is starting up. DB connections are ready via SessionLocal.")
