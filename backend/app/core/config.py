from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "LegalAid API"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # JWT / Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Gemini API Key
    GEMINI_API_KEY: str
    DEFAULT_MODEL: str = "gemini-2.5-flash"

    # RAG
    PDF_PATH: str = "data/motor_traffic_law.pdf"
    INDEX_DIR: str = "storage/faiss_index"
    EMBED_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 3

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    @property
    def database_url(self) -> str:
        """Construct database URL."""
        return (
            f"postgresql://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )


settings = Settings()
