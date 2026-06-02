"""Outbound-message contract.

The orchestrator and the OTP service publish replies without knowing the
transport. The NATS implementation lives in `app.messaging.nats`; tests can
supply a fake.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class MessagePublisher(Protocol):
    """Publishes a text message to a recipient (e.g. a WhatsApp number)."""

    async def publish_text(self, to: str, text: str) -> None: ...
