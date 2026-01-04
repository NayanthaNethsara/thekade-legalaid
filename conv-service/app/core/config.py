from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    DIRECT_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    KAFKA_BROKER_URL: str = "localhost:9092"
    KAFKA_TOPIC_INCOMING: str = "whatsapp.incoming.messages"
    KAFKA_TOPIC_INCOMING_FILE: str = "whatsapp.incoming.files"
    KAFKA_TOPIC_OUTGOING: str = "whatsapp.outgoing.messages"
    
    KAFKA_USERNAME: str = ""
    KAFKA_PASSWORD: str = ""
    KAFKA_SSL: bool = False
    KAFKA_SASL_MECHANISM: str = "PLAIN"

    class Config:
        env_file = ".env"

settings = Settings()
