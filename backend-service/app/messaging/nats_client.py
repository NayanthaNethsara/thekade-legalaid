import nats
from nats.aio.client import Client as NatsConnection
from nats.js import JetStreamContext

from app.core.config import NatsSettings
from app.core.logging import get_logger

logger = get_logger(__name__)


class NatsClient:
    """Owns the NATS connection and JetStream context lifecycle.

    The stream is created and managed by the whatsapp-gateway; the orchestrator
    only ensures the subjects it needs are present before binding consumers.
    """

    def __init__(self, settings: NatsSettings) -> None:
        self._settings = settings
        self._connection: NatsConnection | None = None
        self._jetstream: JetStreamContext | None = None

    @property
    def jetstream(self) -> JetStreamContext:
        if self._jetstream is None:
            raise RuntimeError("NATS JetStream is not connected")
        return self._jetstream

    @property
    def is_connected(self) -> bool:
        return self._connection is not None and self._connection.is_connected

    async def connect(self) -> None:
        logger.info("nats.connecting", url=self._settings.url)
        self._connection = await nats.connect(
            self._settings.url,
            name="ai-orchestrator",
            max_reconnect_attempts=-1,
        )
        self._jetstream = self._connection.jetstream()
        await self._ensure_stream()
        logger.info("nats.connected", url=self._settings.url)

    async def _ensure_stream(self) -> None:
        """Create the stream if absent, or extend it with any missing subjects."""

        assert self._jetstream is not None
        subjects = [*self._settings.incoming_subjects, self._settings.subject_outgoing]
        try:
            info = await self._jetstream.stream_info(self._settings.stream_name)
            existing = set(info.config.subjects or [])
            merged = sorted(existing | set(subjects))
            if merged != sorted(existing):
                info.config.subjects = merged
                await self._jetstream.update_stream(config=info.config)
        except Exception:
            await self._jetstream.add_stream(name=self._settings.stream_name, subjects=subjects)

    async def close(self) -> None:
        if self._connection is not None:
            logger.info("nats.closing")
            await self._connection.drain()
            self._connection = None
            self._jetstream = None
