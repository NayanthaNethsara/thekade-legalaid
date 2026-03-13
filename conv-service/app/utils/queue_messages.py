from typing import Optional


def extract_incoming_text(message: dict) -> Optional[str]:
    """Pull the user's text out of a normalized WhatsApp queue payload."""
    msg_type = message.get("type", "")
    content = message.get("content")

    if isinstance(content, str) and content.strip():
        return content.strip()

    if not isinstance(content, dict):
        content = {}

    normalized_text = content.get("text")
    if isinstance(normalized_text, str) and normalized_text.strip():
        return normalized_text.strip()

    if msg_type == "text":
        body = (
            content.get("text")
            or message.get("text", {}).get("body")
            or message.get("body", "")
        )
        return body.strip() or None

    if msg_type == "interactive":
        interactive = content.get("interactive", {}) or message.get("interactive", {})
        title = (
            interactive.get("buttonReply", {}).get("title")
            or interactive.get("listReply", {}).get("title")
            or interactive.get("button_reply", {}).get("title")
            or interactive.get("list_reply", {}).get("title")
        )
        return title.strip() if title else None

    return None


def build_outgoing_text_message(phone: str, text: str) -> dict:
    """Build the normalized outbound queue payload expected by the gateway."""
    return {
        "to": phone,
        "type": "text",
        "content": {"text": text},
    }


def build_outgoing_media_message(
    phone: str,
    media_type: str,
    media_reference: str,
    caption: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict:
    """Build a normalized outbound media payload for the gateway media queue."""
    content = {"mediaUrl": media_reference}
    if caption:
        content["caption"] = caption
    if filename:
        content["filename"] = filename

    return {
        "to": phone,
        "type": media_type,
        "content": content,
    }