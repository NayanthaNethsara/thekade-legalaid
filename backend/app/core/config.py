from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DEBUG: bool = False
    WHATSAPP_ACCESS_TOKEN: str
    BUSINESS_PHONE_NUMBER_ID: str
    VERIFY_TOKEN: str
    N8N_WEBHOOK_URL: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
