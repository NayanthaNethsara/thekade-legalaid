"""Pydantic models mirroring the whatsapp-gateway NATS contract.

The gateway normalizes every WhatsApp message into one of five incoming formats
(text, image, video, audio, document) that share a common envelope, and consumes
a set of outgoing formats. These models are the orchestrator's view of that
contract; see whatsapp-gateway/docs for the authoritative specification.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field


class IncomingMessageMetadata(BaseModel):
    phone_number_id: str = Field(alias="phoneNumberId")
    display_phone_number: str = Field(alias="displayPhoneNumber")


class IncomingMessageContext(BaseModel):
    message_id: str = Field(alias="messageId")
    from_: str = Field(alias="from")


class IncomingMessageEnvelope(BaseModel):
    model_config = {"populate_by_name": True}

    message_id: str = Field(alias="messageId")
    from_: str = Field(alias="from")
    to: str
    timestamp: str
    contact_name: str | None = Field(default=None, alias="contactName")
    context: IncomingMessageContext | None = None
    metadata: IncomingMessageMetadata


class IncomingTextMessage(IncomingMessageEnvelope):
    type: Literal["text"]
    text: str
    source: Literal["text", "button_reply", "list_reply", "quick_reply"]
    reply_id: str | None = Field(default=None, alias="replyId")


class IncomingMediaEnvelope(IncomingMessageEnvelope):
    media_id: str = Field(alias="mediaId")
    mime_type: str | None = Field(default=None, alias="mimeType")
    sha256: str | None = None


class IncomingImageMessage(IncomingMediaEnvelope):
    type: Literal["image"]
    caption: str | None = None


class IncomingVideoMessage(IncomingMediaEnvelope):
    type: Literal["video"]
    caption: str | None = None


class IncomingAudioMessage(IncomingMediaEnvelope):
    type: Literal["audio"]
    voice: bool


class IncomingDocumentMessage(IncomingMediaEnvelope):
    type: Literal["document"]
    caption: str | None = None
    filename: str | None = None


IncomingMessage = Annotated[
    IncomingTextMessage
    | IncomingImageMessage
    | IncomingVideoMessage
    | IncomingAudioMessage
    | IncomingDocumentMessage,
    Field(discriminator="type"),
]


class OutgoingTextContent(BaseModel):
    model_config = {"populate_by_name": True}

    text: str
    preview_url: bool | None = Field(default=None, alias="previewUrl")


class OutgoingTextMessage(BaseModel):
    model_config = {"populate_by_name": True}

    to: str
    type: Literal["text"] = "text"
    content: OutgoingTextContent
    reply_to_message_id: str | None = Field(default=None, alias="replyToMessageId")


class InteractiveHeader(BaseModel):
    model_config = {"populate_by_name": True}

    type: Literal["text", "image", "video", "document"]
    text: str | None = None
    media_url: str | None = Field(default=None, alias="mediaUrl")
    media_id: str | None = Field(default=None, alias="mediaId")


class InteractiveBody(BaseModel):
    text: str


class CtaUrlAction(BaseModel):
    model_config = {"populate_by_name": True}

    display_text: str = Field(alias="displayText")
    url: str


class CtaUrlInteractive(BaseModel):
    """Single URL button, optionally with a media header (one product card)."""

    type: Literal["cta_url"] = "cta_url"
    header: InteractiveHeader | None = None
    body: InteractiveBody
    footer: InteractiveBody | None = None
    action: CtaUrlAction


class CarouselCard(BaseModel):
    model_config = {"populate_by_name": True}

    header: InteractiveHeader
    body: InteractiveBody | None = None
    cta_url: CtaUrlAction = Field(alias="ctaUrl")


class CarouselInteractive(BaseModel):
    """Horizontally scrollable media cards (product gallery), max 10 cards."""

    type: Literal["carousel"] = "carousel"
    body: InteractiveBody
    cards: list[CarouselCard]


class OutgoingInteractiveContent(BaseModel):
    interactive: CtaUrlInteractive | CarouselInteractive


class OutgoingInteractiveMessage(BaseModel):
    model_config = {"populate_by_name": True}

    to: str
    type: Literal["interactive"] = "interactive"
    content: OutgoingInteractiveContent
    reply_to_message_id: str | None = Field(default=None, alias="replyToMessageId")


OutgoingMessage = OutgoingTextMessage | OutgoingInteractiveMessage
