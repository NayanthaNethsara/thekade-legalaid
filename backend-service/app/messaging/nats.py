"""NATS connection, outbound publisher, and inbound WhatsApp-text subscriber.

Mirrors the whatsapp-gateway DTOs so replies relay without translation:
  incoming  {messageId, from, text}
  outgoing  {to, type: "text", content: {text}}

The broker implements `MessagePublisher`, so the OTP service and the orchestrator
publish replies without depending on NATS directly.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Awaitable, Callable

import nats
from nats.aio.client import Client as NATSClient
from nats.aio.msg import Msg

logger = logging.getLogger(__name__)

# Handler invoked for each decoded inbound text message.
IncomingHandler = Callable[["IncomingText"], Awaitable[None]]


@dataclass(frozen=True)
class IncomingText:
    """A decoded inbound WhatsApp text (only the fields we consume)."""

    message_id: str
    sender: str
    text: str


class NatsBroker:
    """Owns the NATS connection and the WhatsApp subject wiring."""

    def __init__(self, url: str, outgoing_subject: str) -> None:
        self._url = url
        self._outgoing_subject = outgoing_subject
        self._nc: NATSClient | None = None

    async def connect(self) -> None:
        self._nc = await nats.connect(
            self._url,
            name="backend-service",
            max_reconnect_attempts=-1,
            reconnect_time_wait=2,
            error_cb=self._on_error,
            disconnected_cb=self._on_disconnected,
            reconnected_cb=self._on_reconnected,
            closed_cb=self._on_closed,
        )
        logger.info("NATS connected: %s", self._url)

    async def close(self) -> None:
        if self._nc is not None and not self._nc.is_closed:
            await self._nc.drain()
            logger.info("NATS connection drained")

    async def publish_text(self, to: str, text: str) -> None:
        """Publish a text reply for the gateway to deliver. Satisfies MessagePublisher."""
        if self._nc is None:
            raise RuntimeError("NATS broker is not connected")
        payload = {"to": to, "type": "text", "content": {"text": text}}
        await self._nc.publish(self._outgoing_subject, json.dumps(payload).encode())

    async def subscribe_incoming(self, subject: str, handler: IncomingHandler) -> None:
        """Bind ``handler`` to inbound text messages on ``subject``."""
        if self._nc is None:
            raise RuntimeError("NATS broker is not connected")

        async def _on_message(msg: Msg) -> None:
            try:
                raw = json.loads(msg.data)
            except json.JSONDecodeError:
                # Never log the raw payload; it carries the sender and body.
                logger.error("worker: malformed incoming message")
                return
            sender = raw.get("from") or ""
            if not sender:
                logger.warning("worker: incoming message missing sender")
                return
            incoming = IncomingText(
                message_id=raw.get("messageId", ""),
                sender=sender,
                text=raw.get("text", ""),
            )
            try:
                await handler(incoming)
            except Exception:
                logger.exception("worker: handler failed for message")

        await self._nc.subscribe(subject, cb=_on_message)
        logger.info("worker: subscribed to %s -> %s", subject, self._outgoing_subject)

    # ----------------------------------------------------------- callbacks
    async def _on_error(self, err: Exception) -> None:
        logger.warning("NATS error: %s", err)

    async def _on_disconnected(self) -> None:
        logger.warning("NATS disconnected")

    async def _on_reconnected(self) -> None:
        logger.info("NATS reconnected")

    async def _on_closed(self) -> None:
        logger.info("NATS connection closed")
