import httpx
from app.core.config import settings, get_whatsapp_api_url


async def process_text_message(message: dict):
    """Process text messages from WhatsApp"""
    user_id = message.get("from")
    text = message.get("text", {}).get("body")

    if not text:
        return

    print(f"Message from {user_id}: {text}") 
    await send_whatsapp_reply(user_id, f"Echo: {text}")


async def send_whatsapp_reply(user_id: str, text: str):
    url = f"https://graph.facebook.com/v22.0/{settings.BUSINESS_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}", "Content-Type": "application/json"}
    data = {
        "messaging_product": "whatsapp",
        "to": user_id,
        "type": "text",
        "text": {"body": text}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=data, headers=headers)
        resp.raise_for_status()
        print("Message sent:", resp.json())