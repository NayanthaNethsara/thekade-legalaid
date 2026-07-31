from app.core.logging import get_logger
from app.core.security.phone import InvalidPhoneError, normalize_phone
from app.handlers.whatsapp_messages import build_outgoing_messages
from app.messaging.publisher import OutgoingPublisher
from app.messaging.schemas import (
    IncomingMessage,
    IncomingTextMessage,
    OutgoingTextContent,
    OutgoingTextMessage,
)
from app.orchestrator.service import Orchestrator
from app.schemas.chat import ChatResponse

logger = get_logger(__name__)

_HANDLER_ERROR_REPLY = "Sorry, something went wrong on our end. Please try again shortly."


class AgentHandler:
    """WhatsApp adapter for the AI orchestrator.

    Guarantees a reply is always sent back to the user.  If the orchestrator
    or publisher fails at any point, a safe error message is delivered.
    """

    def __init__(self, publisher: OutgoingPublisher, orchestrator: Orchestrator) -> None:
        self._publisher = publisher
        self._orchestrator = orchestrator

    async def handle(self, message: IncomingMessage, user_id: str | None = None) -> None:
        logger.info(
            "agent.received",
            type=message.type,
            from_=message.from_,
            message_id=message.message_id,
        )

        thread_id = f"wa:{message.from_}"
        response = await self._orchestrator.respond(
            self._extract_text(message),
            thread_id,
            channel="whatsapp",
            user_identity=self._identity(message.from_),
            principal_id=user_id,
            principal_kind="user" if user_id else None,
        )

        try:
            await self._send_response(message, response)
        except Exception:
            logger.exception(
                "agent.publish_failed",
                from_=message.from_,
                message_id=message.message_id,
            )
            try:
                await self._send_reply(message, _HANDLER_ERROR_REPLY)
            except Exception:
                logger.exception(
                    "agent.error_reply_failed",
                    from_=message.from_,
                    message_id=message.message_id,
                )

    async def _send_response(self, message: IncomingMessage, response: ChatResponse) -> None:
        outgoing_messages = build_outgoing_messages(
            to=message.from_,
            response=response,
        )
        for outgoing in outgoing_messages:
            await self._publisher.send(outgoing)

    async def _send_reply(self, message: IncomingMessage, text: str) -> None:
        await self._publisher.send_text(
            OutgoingTextMessage(
                to=message.from_,
                content=OutgoingTextContent(text=text),
            )
        )

    def _extract_text(self, message: IncomingMessage) -> str:
        if isinstance(message, IncomingTextMessage):
            return message.text
        return f"[{message.type} message]"

    def _identity(self, sender: str) -> str | None:
        """Canonical phone the customer shares with the web app (cross-channel memory key)."""
        try:
            return normalize_phone(sender)
        except InvalidPhoneError:
            return None
