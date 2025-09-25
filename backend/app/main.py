from fastapi import FastAPI
from app.api.routes import auth
from app.api.routes.chatbot import router as chatbot_router
from app.api.routes.health import router as health_router
from app.services.rag.vectorstore import build_or_load_index  # 👈 add this
from app.core.logging import setup_logging
from app.db.database import db_manager


app = FastAPI()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chatbot_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1", tags=["Health"])


# Database and service initialization
@app.on_event("startup")
async def startup_event():
    print("🚀 Starting LegalAid API server...")
    print("📊 PostgreSQL connections are ready via SessionLocal.")
    
    # Initialize MongoDB connection
    await db_manager.connect_mongodb()
    
    # Initialize Redis connection
    await db_manager.connect_redis()
    
    print("✅ All database connections established successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down LegalAid API server...")
    
    # Close MongoDB connection
    await db_manager.disconnect_mongodb()
    
    # Close Redis connection  
    await db_manager.disconnect_redis()
    
    print("✅ All database connections closed successfully!")
