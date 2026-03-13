import asyncio
import json
from typing import Any, AsyncGenerator, Awaitable, Callable, Optional

from nats.aio.client import Client as NATS
from nats.js.errors import NotFoundError

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class NatsService:
    def __init__(self):
        self.nc: Optional[NATS] = None
        self.js = None

    def _all_subjects(self) -> list[str]:
        subjects = [
            settings.NATS_SUBJECT_INCOMING,
            settings.NATS_SUBJECT_INCOMING_FILE,
            settings.NATS_SUBJECT_OUTGOING,
        ]

        # Optional legacy subjects (if present in environment/settings)
        maybe_indexing = getattr(settings, "NATS_SUBJECT_INDEXING_TRUSTED", None)
        maybe_rag_queries = getattr(settings, "NATS_SUBJECT_RAG_QUERIES", None)
        if maybe_indexing:
            subjects.append(maybe_indexing)
        if maybe_rag_queries:
            subjects.append(maybe_rag_queries)

        return subjects

    async def _ensure_stream(self):
        subjects = [s for s in self._all_subjects() if s]
        if not subjects:
            raise ValueError("No NATS subjects configured")

        try:
            info = await self.js.stream_info(settings.NATS_STREAM_NAME)
            current = set(info.config.subjects or [])
            required = set(subjects)
            if not required.issubset(current):
                await self.js.update_stream(
                    name=settings.NATS_STREAM_NAME,
                    subjects=sorted(current | required),
                )
        except NotFoundError:
            await self.js.add_stream(
                name=settings.NATS_STREAM_NAME,
                subjects=subjects,
            )

    async def start(self):
        if self.nc and self.nc.is_connected:
            return

        self.nc = NATS()
        await self.nc.connect(servers=[settings.NATS_URL])
        self.js = self.nc.jetstream()
        await self._ensure_stream()
        logger.info("NATS JetStream connection started")

    async def stop(self):
        if self.nc and self.nc.is_connected:
            await self.nc.drain()
            await self.nc.close()
        logger.info("NATS JetStream connection stopped")

    async def send_message(self, topic: str, message: dict):
        try:
            if not self.nc or not self.nc.is_connected:
                await self.start()

            payload = json.dumps(message).encode("utf-8")
            await self.js.publish(topic, payload)
            logger.info(f"Published message to {topic}")
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")

    def _durable_name(self, subject: str) -> str:
        safe = subject.replace(".", "_").replace("*", "all").replace(">", "tail")
        return f"conv_{safe}"[:64]

    async def _message_generator(self, subject: str) -> AsyncGenerator[dict, None]:
        if not self.nc or not self.nc.is_connected:
            await self.start()

        subscription = await self.js.subscribe(
            subject,
            stream=settings.NATS_STREAM_NAME,
            durable=self._durable_name(subject),
            manual_ack=True,
        )

        while True:
            try:
                msg = await subscription.next_msg(timeout=1.0)
            except asyncio.TimeoutError:
                continue

            try:
                payload = json.loads(msg.data.decode("utf-8"))
            except Exception:
                payload = {"raw": msg.data.decode("utf-8", errors="replace")}

            await msg.ack()
            yield payload

    async def consume_messages(
        self,
        topic_or_callback: str | Callable[[dict], Awaitable[None]],
        callback: Optional[Callable[[dict], Awaitable[None]]] = None,
    ):
        try:
            if callable(topic_or_callback):
                subject = settings.NATS_SUBJECT_INCOMING
                async for payload in self._message_generator(subject):
                    await topic_or_callback(payload)
                return

            subject = topic_or_callback

            if callback is not None:
                async for payload in self._message_generator(subject):
                    await callback(payload)
                return

            async for payload in self._message_generator(subject):
                yield payload
        except Exception as e:
            logger.error(f"Error consuming messages: {e}")
