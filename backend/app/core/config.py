from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
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

    #Gemini API Key
    GEMINI_API_KEY: str
    DEFAULT_MODEL: str = "gemini-1.5-pro"

    model_config = SettingsConfigDict(env_file=".env",extra="allow")


settings = Settings()
