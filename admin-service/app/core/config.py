from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://legalaid:legalaid@localhost:5432/legalaid"
    GEMINI_API_KEY: str = ""
    DATA_DIR: str = "/app/data"

    class Config:
        env_file = ".env"


settings = Settings()
