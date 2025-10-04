from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DEBUG: bool = False
    WHATSAPP_ACCESS_TOKEN: str
    BUSINESS_PHONE_NUMBER_ID: str
    VERIFY_TOKEN: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

def get_whatsapp_api_url() -> str:
    return f"https://graph.facebook.com/v22.0/{Settings.BUSINESS_PHONE_NUMBER_ID}/messages"
