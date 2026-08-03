from functools import lru_cache
from typing import Any, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.rate_limit import RateLimitPolicy


class NatsSettings(BaseSettings):
    """NATS JetStream connection and subject mapping.

    Subjects mirror the contract published by the whatsapp-gateway so the
    backend consumes the same events the gateway produces.
    """

    model_config = SettingsConfigDict(env_prefix="NATS_")

    url: str = "nats://localhost:4222"
    stream_name: str = Field(default="KAKILLE_AGENT_EVENTS", alias="NATS_STREAM_NAME")
    durable_name: str = Field(default="backend-service", alias="NATS_DURABLE_NAME")

    # Time allowed for the backend to process a message before NATS redelivers it.
    ack_wait_seconds: int = Field(default=300, alias="NATS_ACK_WAIT_SECONDS")
    # Concurrency limit per subject.
    # NATS will hold delivery if this many messages are unacknowledged.
    max_ack_pending: int = Field(default=10, alias="NATS_MAX_ACK_PENDING")

    subject_incoming_text: str = Field(
        default="whatsapp.incoming.text", alias="NATS_SUBJECT_INCOMING_TEXT"
    )
    subject_incoming_image: str = Field(
        default="whatsapp.incoming.media.image", alias="NATS_SUBJECT_INCOMING_IMAGE"
    )
    subject_incoming_video: str = Field(
        default="whatsapp.incoming.media.video", alias="NATS_SUBJECT_INCOMING_VIDEO"
    )
    subject_incoming_audio: str = Field(
        default="whatsapp.incoming.media.audio", alias="NATS_SUBJECT_INCOMING_AUDIO"
    )
    subject_incoming_document: str = Field(
        default="whatsapp.incoming.media.document", alias="NATS_SUBJECT_INCOMING_DOCUMENT"
    )
    subject_outgoing: str = Field(default="whatsapp.outgoing", alias="NATS_SUBJECT_OUTGOING")

    @property
    def incoming_subjects(self) -> list[str]:
        return [
            self.subject_incoming_text,
            self.subject_incoming_image,
            self.subject_incoming_video,
            self.subject_incoming_audio,
            self.subject_incoming_document,
        ]


class LLMSettings(BaseSettings):
    """Pluggable LLM provider configuration.

    `provider` selects the backend (Vertex AI or the Gemini Developer API); the
    rest of the app depends only on the resulting LangChain chat model, so adding
    a provider is a localized change in `app/orchestrator/model.py`. Credentials
    use each provider's standard env vars to match cloud conventions. An
    unconfigured provider (see `is_configured`) disables the orchestrator, which
    then returns a graceful fallback reply so the service still boots.
    """

    provider: Literal["vertexai", "gemini"] = Field(default="vertexai", alias="LLM_PROVIDER")
    model: str = Field(default="gemini-2.5-flash", alias="LLM_MODEL")
    generation_model: str = Field(default="", alias="LLM_GENERATION_MODEL")
    temperature: float = Field(default=0.7, alias="LLM_TEMPERATURE")

    # Vertex AI: authenticated via Application Default Credentials; project and
    # location come from the standard Google Cloud env vars.
    project: str = Field(default="", alias="GOOGLE_CLOUD_PROJECT")
    location: str = Field(default="global", alias="GOOGLE_CLOUD_LOCATION")

    # Gemini Developer API: a single API key.
    api_key: str = Field(default="", alias="GEMINI_API_KEY")

    @property
    def is_configured(self) -> bool:
        """Whether the selected provider has the credentials it needs."""
        if self.provider == "vertexai":
            return bool(self.project)
        return bool(self.api_key)

    @property
    def generation_model_name(self) -> str:
        """Model that writes customer-facing replies, falling back to `model`."""
        return self.generation_model or self.model


class McpSettings(BaseSettings):
    """First-party Kakille MCP server (legal knowledge search).

    Defaults target the in-repo MCP server (`app.mcp_server.main`) running on
    port 8010. An empty `url` disables MCP tools; the orchestrator then answers
    without knowledge-base search. `api_key` is the shared bearer secret between
    the orchestrator (client) and the MCP server; when blank, the server skips
    auth (dev only).
    """

    model_config = SettingsConfigDict(env_prefix="MCP_")

    url: str = "http://localhost:8010/mcp"
    api_key: str = ""

    cache_ttl_seconds: int = 1800


class SourcesSettings(BaseSettings):
    """Workspace source intake limits.

    Original file bytes are never stored -- only text extracted at upload, so
    ``max_text_chars`` bounds what one source can add to the database and to
    the agent's context.
    """

    model_config = SettingsConfigDict(env_prefix="SOURCES_")

    max_file_bytes: int = 10 * 1024 * 1024
    max_text_chars: int = 200_000
    max_per_conversation: int = 300


class VisionSettings(BaseSettings):
    """Image-search (KakilleVision) identification settings.

    The image arrives inline as a base64 data URL from our own authenticated
    frontend, is identified by the multimodal model, then discarded -- it is
    never fetched from a remote URL or stored. ``max_image_bytes`` caps the
    decoded image size; ``enabled=False`` ignores attached images entirely.
    """

    model_config = SettingsConfigDict(env_prefix="VISION_", populate_by_name=True)

    enabled: bool = True
    max_image_bytes: int = Field(default=8 * 1024 * 1024, alias="VISION_MAX_IMAGE_BYTES")


class ModelArmorSettings(BaseSettings):
    """Google Model Armor guardrail for screening user prompts.

    Inactive unless a template is configured (`is_active`), so the orchestrator
    runs without it until set up. Reuses the Vertex AI project and credentials;
    create a template -- default settings are fine -- and set
    `MODEL_ARMOR_TEMPLATE`. Model Armor is regional, so its location is separate
    from the LLM's (it does not support `global`).
    """

    project: str = Field(default="", alias="GOOGLE_CLOUD_PROJECT")
    location: str = Field(default="us-central1", alias="MODEL_ARMOR_LOCATION")
    template: str = Field(default="", alias="MODEL_ARMOR_TEMPLATE")

    @property
    def is_active(self) -> bool:
        return bool(self.project) and bool(self.template)

    @property
    def template_path(self) -> str:
        # Accept either a bare template id or an already-qualified resource path.
        if "/" in self.template:
            return self.template
        return f"projects/{self.project}/locations/{self.location}/templates/{self.template}"

    @property
    def api_endpoint(self) -> str:
        return f"modelarmor.{self.location}.rep.googleapis.com"


class DatabaseSettings(BaseSettings):
    """Async Postgres connection.

    Defaults target the docker-compose Postgres exposed on host port 5433.
    """

    model_config = SettingsConfigDict(env_prefix="DATABASE_")

    url: str = "postgresql+asyncpg://kakille_agent:kakille_agent@localhost:5433/kakille_agent"
    echo: bool = False

    @field_validator("url", mode="before")
    @classmethod
    def convert_sync_schema(cls, v: Any) -> Any:
        if isinstance(v, str):
            if v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if "sslmode=" in v:
                v = v.replace("sslmode=", "ssl=")
            return v
        return v

    @property
    def psycopg_dsn(self) -> str:
        """Plain ``postgresql://`` DSN for psycopg (used by the LangGraph checkpointer)."""
        dsn = self.url.replace("postgresql+asyncpg://", "postgresql://")
        if "ssl=" in dsn:
            dsn = dsn.replace("ssl=", "sslmode=")
        return dsn


class RedisSettings(BaseSettings):
    """Redis connection for ephemeral, TTL-bound state (e.g. guest sessions)."""

    model_config = SettingsConfigDict(env_prefix="REDIS_")

    url: str = "redis://localhost:6379/0"


class RateLimitSettings(BaseSettings):
    """Sliding-window request limits, backed by Redis.

    Each pair is ``<limit> requests per <window> seconds``. The auth limit is
    tight because sign-in gates token minting; the global limit is a loose
    per-IP safety net for everything else. Setting ``enabled=False`` disables
    all checks (useful for tests and local dev).
    """

    model_config = SettingsConfigDict(env_prefix="RATE_LIMIT_")

    enabled: bool = True

    auth_limit: int = 5
    auth_window_seconds: int = 60

    chat_limit: int = 30
    chat_window_seconds: int = 60

    guest_create_limit: int = 10
    guest_create_window_seconds: int = 3600

    global_limit: int = 120
    global_window_seconds: int = 60

    @property
    def auth_policy(self) -> RateLimitPolicy:
        return RateLimitPolicy(self.auth_limit, self.auth_window_seconds)

    @property
    def chat_policy(self) -> RateLimitPolicy:
        return RateLimitPolicy(self.chat_limit, self.chat_window_seconds)

    @property
    def guest_create_policy(self) -> RateLimitPolicy:
        return RateLimitPolicy(self.guest_create_limit, self.guest_create_window_seconds)

    @property
    def global_policy(self) -> RateLimitPolicy:
        return RateLimitPolicy(self.global_limit, self.global_window_seconds)


class AuthSettings(BaseSettings):
    """Token signing and lifetimes for the two separate account kinds.

    Web accounts sign in with Google through Firebase; the backend verifies the
    Firebase ID token against `firebase_project_id` and issues its own JWTs.
    WhatsApp accounts are keyed on the canonical phone number;
    `default_country_code` is the region assumed when normalizing one (e.g.
    Sri Lankan `0702358060`).
    """

    model_config = SettingsConfigDict(env_prefix="AUTH_")

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_ttl_minutes: int = 15
    refresh_ttl_days: int = 30
    default_country_code: str = "94"
    guest_ttl_seconds: int = 86400

    firebase_project_id: str = Field(default="", alias="FIREBASE_PROJECT_ID")


class AdminAuthSettings(BaseSettings):
    """Single-user admin authentication credentials and secret configuration."""

    model_config = SettingsConfigDict(env_prefix="ADMIN_")

    username: str = Field(default="admin", alias="ADMIN_USERNAME")
    password: str = Field(default="admin123", alias="ADMIN_PASSWORD")
    secret_key: str = Field(default="admin-dev-secret-change-me", alias="ADMIN_SECRET_KEY")


class Settings(BaseSettings):
    """Top-level application settings, composed from grouped sub-settings."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "backend-service"
    environment: str = "development"
    log_level: str = "INFO"
    http_port: int = 8000

    # Shared secret proving a request originates from our own frontend (the only
    # client allowed to mint and use guest sessions).
    internal_api_key: str = Field(default="dev-internal-key-change-me", alias="INTERNAL_API_KEY")

    nats: NatsSettings = Field(default_factory=NatsSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)
    admin_auth: AdminAuthSettings = Field(default_factory=AdminAuthSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    vision: VisionSettings = Field(default_factory=VisionSettings)
    model_armor: ModelArmorSettings = Field(default_factory=ModelArmorSettings)
    mcp: McpSettings = Field(default_factory=McpSettings)
    sources: SourcesSettings = Field(default_factory=SourcesSettings)


@lru_cache
def get_settings() -> Settings:
    return Settings()
