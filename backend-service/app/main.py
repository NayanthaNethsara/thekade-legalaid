from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.api.deps import require_internal_key
from app.api.rate_limit import add_global_rate_limit
from app.api.routes import auth, cart, chat, guest, health, profile
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging, get_logger
from app.db.redis import dispose_redis
from app.db.session import dispose_engine, get_sessionmaker
from app.handlers.agent import AgentHandler
from app.handlers.whatsapp_registration import WhatsAppRegistrar
from app.messaging.consumer import IncomingConsumer
from app.messaging.nats_client import NatsClient
from app.messaging.publisher import OutgoingPublisher
from app.messaging.schemas import IncomingMessage
from app.orchestrator import orchestrator

logger = get_logger(__name__)

_DEFAULT_JWT_SECRET = "dev-secret-change-me"
_DEFAULT_INTERNAL_API_KEY = "dev-internal-key-change-me"


def _guard_production_secrets(settings: Settings) -> None:
    """Fail fast on insecure defaults that must never reach production."""

    if settings.environment != "production":
        return

    if settings.auth.jwt_secret == _DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "AUTH_JWT_SECRET is still the development default; set a strong secret "
            "before running in production."
        )

    if settings.internal_api_key == _DEFAULT_INTERNAL_API_KEY:
        raise RuntimeError(
            "INTERNAL_API_KEY is still the development default; set a strong secret "
            "before running in production."
        )

    if not settings.auth.firebase_project_id:
        raise RuntimeError(
            "FIREBASE_PROJECT_ID is not set; web sign-in cannot verify Google "
            "credentials in production."
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Wire dependencies and run the NATS worker for the app's lifetime."""

    settings: Settings = get_settings()
    configure_logging(settings.log_level)
    _guard_production_secrets(settings)
    logger.info("service.starting", service=settings.service_name, env=settings.environment)

    await orchestrator.start(settings)

    nats_client = NatsClient(settings.nats)
    await nats_client.connect()

    publisher = OutgoingPublisher(nats_client, settings.nats)
    agent_handler = AgentHandler(publisher, orchestrator)
    registrar = WhatsAppRegistrar(get_sessionmaker(), settings.auth)

    async def on_incoming(message: IncomingMessage) -> None:
        # Ensure the sender has an account before the orchestrator replies.
        user_id = await registrar.ensure_user(message)
        await agent_handler.handle(message, user_id)

    consumer = IncomingConsumer(nats_client, settings.nats, on_incoming)
    await consumer.start()

    app.state.nats_client = nats_client
    logger.info("service.ready")

    try:
        yield
    finally:
        logger.info("service.stopping")
        await consumer.stop()
        await nats_client.close()
        await orchestrator.stop()
        await dispose_engine()
        await dispose_redis()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name, lifespan=lifespan)
    app.state.nats_client = None
    add_global_rate_limit(app, settings)

    # No CORS middleware on purpose: the browser never talks to this service.
    # Every business route requires the frontend's internal key, so the Next.js
    # server is the only client; health and metrics stay open for infra probes.
    frontend_only = [Depends(require_internal_key)]

    app.include_router(health.router)
    app.include_router(auth.router, dependencies=frontend_only)
    app.include_router(guest.router, dependencies=frontend_only)
    app.include_router(chat.router, dependencies=frontend_only)
    app.include_router(cart.router, dependencies=frontend_only)
    app.include_router(profile.router, dependencies=frontend_only)

    # Prometheus scrape target for guardrail and future metrics. A direct route
    # (not a sub-app mount) so /metrics returns 200 without a trailing-slash 307.
    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app


app = create_app()
