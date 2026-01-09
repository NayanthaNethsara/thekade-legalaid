from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DIRECT_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Kafka
    KAFKA_BROKER_URL: str = "localhost:9092"
    KAFKA_TOPIC_INCOMING: str = "whatsapp.incoming.messages"
    KAFKA_TOPIC_INCOMING_FILE: str = "whatsapp.incoming.files"
    KAFKA_TOPIC_OUTGOING: str = "whatsapp.outgoing.messages"
    KAFKA_TOPIC_INDEXING_TRUSTED: str = "indexing.trusted_files"
    KAFKA_TOPIC_RAG_QUERIES: str = "rag.queries"
    
    KAFKA_USERNAME: str = ""
    KAFKA_PASSWORD: str = ""
    KAFKA_SSL: bool = False
    KAFKA_SASL_MECHANISM: str = "PLAIN"
    
    # RAG & Vector Search
    GEMINI_API_KEY: str = ""
    GEMINI_EMBEDDING_MODEL: str = "models/embedding-001"
    VECTOR_DIM: int = 768  # Gemini embedding-001 dimension
    CHUNK_SIZE: int = 1000  # tokens
    CHUNK_OVERLAP: int = 200  # tokens
    RAG_TOP_K: int = 5
    
    # Redis (optional, for caching and session)
    REDIS_URL: str = ""
    
    # Azure Storage (for blob downloads)
    AZURE_STORAGE_CONNECTION_STRING: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
