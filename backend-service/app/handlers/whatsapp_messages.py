"""Build the outgoing WhatsApp messages for an orchestrator reply.

Product cards become interactive messages so customers see images and tappable
product buttons instead of raw URLs: one product renders as a CTA URL card
(image header + button), several render as a media carousel. The reply text
becomes the interactive body when it fits, otherwise it is sent as a separate
text message first. Pay links become a CTA URL button message.
"""

from app.messaging.schemas import (
    CarouselCard,
    CarouselInteractive,
    CtaUrlAction,
    CtaUrlInteractive,
    InteractiveBody,
    InteractiveHeader,
    OutgoingInteractiveContent,
    OutgoingInteractiveMessage,
    OutgoingMessage,
    OutgoingTextContent,
    OutgoingTextMessage,
)
from app.schemas.chat import Action, ChatResponse, ProductCard

# WhatsApp limits: 1024 chars for an interactive bubble body, 10 carousel cards.
_BODY_LIMIT = 1024
_CARD_BODY_LIMIT = 160
_MAX_CAROUSEL_CARDS = 10

_VIEW_PRODUCT_LABEL = "View product"
_CAROUSEL_FALLBACK_BODY = "Here are the options:"
_PAY_BODY = "Tap the button below to continue."


def _whatsapp_safe_image_url(url: str | None) -> str | None:
    """Force the media CDN to serve JPEG.

    `f=auto` negotiates WebP, which WhatsApp rejects at media-fetch time with
    error 131053 ("WebP image uploads are not currently supported").
    """
    if not url:
        return url
    return url.replace("f=auto", "f=jpeg")


def build_outgoing_messages(
    to: str,
    response: ChatResponse,
) -> list[OutgoingMessage]:
    # Interactive cards need both an image (media header) and a target URL.
    cards = [c for c in response.cards if c.image_url and c.url]
    cards = cards[:_MAX_CAROUSEL_CARDS]
    reply = response.reply
    is_reply_body_sized = len(reply) <= _BODY_LIMIT

    messages: list[OutgoingMessage] = []
    if not cards:
        messages.append(_text_message(to, reply))
    elif len(cards) == 1:
        body = reply if is_reply_body_sized else _card_summary(cards[0])
        if not is_reply_body_sized:
            messages.append(_text_message(to, reply))
        messages.append(_single_card_message(to, body, cards[0]))
    else:
        body = reply if is_reply_body_sized else _CAROUSEL_FALLBACK_BODY
        if not is_reply_body_sized:
            messages.append(_text_message(to, reply))
        messages.append(_carousel_message(to, body, cards))

    messages.extend(_action_message(to, action) for action in response.actions)
    return messages


def _text_message(to: str, text: str) -> OutgoingTextMessage:
    return OutgoingTextMessage(to=to, content=OutgoingTextContent(text=text))


def _single_card_message(to: str, body: str, card: ProductCard) -> OutgoingInteractiveMessage:
    interactive = CtaUrlInteractive(
        header=InteractiveHeader(type="image", media_url=_whatsapp_safe_image_url(card.image_url)),
        body=InteractiveBody(text=body),
        action=CtaUrlAction(display_text=_VIEW_PRODUCT_LABEL, url=card.url or ""),
    )
    return _interactive_message(to, interactive)


def _carousel_message(to: str, body: str, cards: list[ProductCard]) -> OutgoingInteractiveMessage:
    interactive = CarouselInteractive(
        body=InteractiveBody(text=body),
        cards=[
            CarouselCard(
                header=InteractiveHeader(
                    type="image", media_url=_whatsapp_safe_image_url(card.image_url)
                ),
                body=InteractiveBody(text=_card_summary(card)),
                cta_url=CtaUrlAction(display_text=_VIEW_PRODUCT_LABEL, url=card.url or ""),
            )
            for card in cards
        ],
    )
    return _interactive_message(to, interactive)


def _action_message(to: str, action: Action) -> OutgoingInteractiveMessage:
    interactive = CtaUrlInteractive(
        body=InteractiveBody(text=_PAY_BODY),
        action=CtaUrlAction(display_text=action.label, url=action.url),
    )
    return _interactive_message(to, interactive)


def _interactive_message(
    to: str, interactive: CtaUrlInteractive | CarouselInteractive
) -> OutgoingInteractiveMessage:
    return OutgoingInteractiveMessage(
        to=to, content=OutgoingInteractiveContent(interactive=interactive)
    )


def _card_summary(card: ProductCard) -> str:
    meta = " - ".join(part for part in (card.price, card.stock) if part)
    summary = f"{card.name}\n{meta}" if meta else card.name
    if len(summary) > _CARD_BODY_LIMIT:
        summary = summary[: _CARD_BODY_LIMIT - 3] + "..."
    return summary
