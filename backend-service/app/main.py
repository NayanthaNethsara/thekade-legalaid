"""kakilleAI backend-service — RAG, auth, messaging, and the agent orchestrator.

Owns the human-in-the-loop RAG builder (PDF -> Markdown -> Gemini embeddings ->
Postgres/pgvector), passwordless auth (OTP + identity), WhatsApp NATS I/O, and the
LangGraph multi-agent orchestrator behind /api/chat and the WhatsApp worker.
"""


from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.documents import router as documents_router
from app.api.documents import search_router
from app.core.config import settings
from app.messaging.nats import IncomingText, NatsBroker
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


async def _handle_incoming(broker: NatsBroker, incoming: IncomingText) -> None:
    """Placeholder WhatsApp worker: reply "hello" to verify the round trip.

    Replaced by the orchestrator call in a later slice. No PII is logged.
    """
    logger.info(
        "worker: incoming text message_id=%s text_len=%d",
        incoming.message_id, len(incoming.text),
    )
    await broker.publish_text(incoming.sender, "hello")
    logger.info("worker: reply published message_id=%s", incoming.message_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    broker = NatsBroker(settings.NATS_URL, settings.NATS_SUBJECT_OUTGOING)
    try:
        await broker.connect()
        await broker.subscribe_incoming(
            settings.NATS_SUBJECT_INCOMING_TEXT,
            lambda incoming: _handle_incoming(broker, incoming),
        )
    except Exception:
        # Keep HTTP (RAG, auth) serving even if NATS is unavailable.
        logger.exception("worker: NATS startup failed; WhatsApp path disabled")
    app.state.nats = broker
    try:
        yield
    finally:
        await broker.close()


app = FastAPI(
    title="kakilleAI Backend",
    description="RAG builder, auth, WhatsApp messaging, and the agent orchestrator.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(documents_router)
app.include_router(search_router)

# Expose Prometheus metrics at /metrics (default HTTP request metrics).
Instrumentator().instrument(app).expose(app)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "kakilleAI-backend"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=False)
