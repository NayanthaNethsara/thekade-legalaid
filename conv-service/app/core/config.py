from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ----------------------------------------------------------------- Database
    DATABASE_URL: str
    DIRECT_URL: str = ""

    # -------------------------------------------------------------------- Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # --------------------------------------------------------------- NATS/JetStream
    NATS_URL: str = "nats://localhost:4222"
    NATS_STREAM_NAME: str = "LEGALAID_EVENTS"
    NATS_SUBJECT_INCOMING_TEXT: str = "whatsapp.incoming.text"
    NATS_SUBJECT_INCOMING_VOICE: str = "whatsapp.incoming.voice"
    NATS_SUBJECT_INCOMING_DOCUMENT: str = "whatsapp.incoming.document"
    NATS_SUBJECT_INCOMING_FILE: str = "whatsapp.incoming.files"
    NATS_SUBJECT_OUTGOING_TEXT: str = "whatsapp.outgoing.text"
    NATS_SUBJECT_OUTGOING_MEDIA: str = "whatsapp.outgoing.media"
    NATS_SUBJECT_INCOMING: str = ""
    NATS_SUBJECT_OUTGOING: str = ""

    # --------------------------------------------------------- LLM (Google Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ------------------------------------------------------------ MCP Tool Server
    # URL of the task-mcp MCP server (SSE transport).
    # Leave empty to run the agent without tool support.
    MCP_SERVER_URL: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
