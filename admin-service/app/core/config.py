from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """kakilleAI admin-service configuration (loaded from .env)."""

    # ----------------------------------------------------------------- Database
    DATABASE_URL: str
    # Used by Alembic. Falls back to DATABASE_URL when empty.
    DIRECT_URL: str = ""

    # ------------------------------------------------------------- Internal auth
    # Shared secret for verifying HMAC-signed requests from the Next.js edge.
    # Empty means signature verification fails closed (every RAG route 401/500s).
    INTERNAL_AUTH_SECRET: str = ""
    # Redis backing the request-nonce store used to reject replays.
    REDIS_URL: str = "redis://localhost:6379"

    # ------------------------------------------------------------- File storage
    # Where source PDFs (and other documents) live.
    DATA_DIR: str = "data"
    # Where parsed/editable Markdown files are written.
    MARKDOWN_DIR: str = "data/markdown"

    # --------------------------------------------------------- Embeddings (Gemini)
    GEMINI_API_KEY: str = ""
    EMBED_MODEL: str = "models/gemini-embedding-001"
    EMBED_DIM: int = 768
    # Max texts per embedding API call.
    EMBED_BATCH_SIZE: int = 100

    # ----------------------------------------------------------------- Chunking
    CHUNK_MAX_CHARS: int = 2000
    CHUNK_OVERLAP: int = 200

    @property
    def alembic_url(self) -> str:
        return self.DIRECT_URL or self.DATABASE_URL

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
