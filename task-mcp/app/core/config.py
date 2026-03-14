import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://legalaid:legalaid@localhost:5432/legalaid",
    )
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIM: int = 768

    class Config:
        env_file = ".env"

settings = Settings()
