from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DEBUG: bool = False
    WHATSAPP_ACCESS_TOKEN: str
    BUSINESS_PHONE_NUMBER_ID: str
    VERIFY_TOKEN: str
    N8N_WEBHOOK_URL: str
    GEMINI_API_KEY: str
    DATABASE_URL: str
    
    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 * 24 * 60  # 30 days
    
    # OTP Settings
    OTP_EXPIRE_MINUTES: int = 5
    OTP_LENGTH: int = 6

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
