from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "LegalAid API"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
  
settings = Settings()
