import asyncio
import json
import time
from collections.abc import Awaitable, Callable

from nats.aio.msg import Msg
from nats.aio.subscription import Subscription
from nats.js.api import ConsumerConfig
from pydantic import TypeAdapter, ValidationError

from app.core.config import NatsSettings
from app.core.logging import get_logger
from app.db.redis import get_redis
from app.messaging.nats_client import NatsClient
from app.messaging.schemas import IncomingMessage

logger = get_logger(__name__)

MessageHandler = Callable[[IncomingMessage], Awaitable[None]]

_incoming_adapter: TypeAdapter[IncomingMessage] = TypeAdapter(IncomingMessage)


class IncomingConsumer:
    """Binds durable JetStream subscriptions for every incoming subject and
    dispatches validated messages to a handler.

    A durable consumer lets the orchestrator restart without losing messages
    published while it was down; failed handlers nak for redelivery.
    """

    _MAX_DELIVERY_ATTEMPTS = 3
    _NAK_DELAY_SECONDS = 5

    def __init__(
        self,
        client: NatsClient,
        settings: NatsSettings,
        handler: MessageHandler,
    ) -> None:
        self._client = client
        self._settings = settings
        self._handler = handler
        self._subscriptions: list[Subscription] = []

    async def start(self) -> None:
        for subject in self._settings.incoming_subjects:
            durable = self._durable_for(subject)
            queue = durable
            try:
                subscription = await self._client.jetstream.subscribe(
                    subject,
                    durable=durable,
                    queue=queue,
                    manual_ack=True,
                    cb=self._on_message,
                    config=ConsumerConfig(
                        ack_wait=self._settings.ack_wait_seconds,
                        max_ack_pending=self._settings.max_ack_pending,
                    ),
                )
            except Exception as error:
                logger.warning(
                    "consumer.subscription_failed_retrying",
                    subject=subject,
                    durable=durable,
                    error=str(error),
                )
                try:
                    await self._client.jetstream.delete_consumer(
                        stream=self._settings.stream_name,
                        consumer=durable,
                    )
                except Exception as delete_error:
                    logger.error(
                        "consumer.delete_failed",
                        subject=subject,
                        durable=durable,
                        error=str(delete_error),
                    )
                subscription = await self._client.jetstream.subscribe(
                    subject,
                    durable=durable,
                    queue=queue,
                    manual_ack=True,
                    cb=self._on_message,
                    config=ConsumerConfig(
                        ack_wait=self._settings.ack_wait_seconds,
                        max_ack_pending=self._settings.max_ack_pending,
                    ),
                )
            self._subscriptions.append(subscription)
            logger.info("consumer.subscribed", subject=subject, queue=queue, durable=durable)

    def _durable_for(self, subject: str) -> str:
        # Durable names cannot contain dots; derive a stable, unique name per subject.
        return f"{self._settings.durable_name}-{subject.replace('.', '-')}"

    async def _on_message(self, msg: Msg) -> None:
        try:
            data = json.loads(msg.data)
            message = _incoming_adapter.validate_python(data)
        except (json.JSONDecodeError, ValidationError) as error:
            # Malformed payloads are not retryable; term to remove from redelivery.
            logger.error("consumer.invalid_message", subject=msg.subject, error=str(error))
            await msg.term()
            return

        # Discard messages older than 1 hour (3600 seconds)
        try:
            msg_time = int(message.timestamp)
            age_seconds = time.time() - msg_time
            if age_seconds > 3600:
                logger.info(
                    "consumer.stale_message_ignored",
                    message_id=message.message_id,
                    age_seconds=int(age_seconds),
                )
                await msg.ack()
                return
        except ValueError:
            pass

        # Deduplicate using Redis to prevent processing the same message twice.
        redis = get_redis()
        dedup_key = f"msg:dedup:{message.message_id}"

        # Try to acquire an exclusive lock for the duration of the ack_wait timeout.
        acquired = await redis.set(
            dedup_key,
            "processing",
            nx=True,
            ex=self._settings.ack_wait_seconds,
        )

        if not acquired:
            logger.info("consumer.duplicate_message_ignored", message_id=message.message_id)
            await msg.ack()
            return

        try:
            await self._handler(message)
            # Mark as done and extend TTL to 24 hours to prevent future duplicates.
            await redis.set(dedup_key, "done", ex=86400)
            await msg.ack()
        except Exception as error:
            # Remove the deduplication lock so a redelivery can process it.
            await redis.delete(dedup_key)

            delivery_count = msg.metadata.num_delivered if msg.metadata else 1
            if delivery_count >= self._MAX_DELIVERY_ATTEMPTS:
                logger.exception(
                    "consumer.handler_failed_permanently",
                    subject=msg.subject,
                    delivery_count=delivery_count,
                    error=str(error),
                )
                await msg.term()
            else:
                logger.exception(
                    "consumer.handler_failed_retrying",
                    subject=msg.subject,
                    delivery_count=delivery_count,
                    retry_delay_seconds=self._NAK_DELAY_SECONDS,
                    error=str(error),
                )
                await msg.nak(delay=self._NAK_DELAY_SECONDS)

    async def stop(self) -> None:
        for subscription in self._subscriptions:
            await subscription.unsubscribe()
        self._subscriptions.clear()
        # Yield so in-flight callbacks observe the unsubscribe.
        await asyncio.sleep(0)
