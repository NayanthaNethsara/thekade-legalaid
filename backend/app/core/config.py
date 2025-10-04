from pydantic import BaseSettings

class Settings(BaseSettings):
    # General
    DEBUG: bool = False
    SECRET_KEY: str

    # Database
    DATABASE_URL: str

    # External APIs
    WHATSAPP_API: str
    VERIFY_TOKEN: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Singleton pattern: import settings everywhere
settings = Settings()
