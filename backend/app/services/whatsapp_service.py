import httpx
from app.core.config import settings, get_whatsapp_api_url
from io import BytesIO
import tempfile

class WhatsAppService:
    def __init__(self):
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.api_url = settings.BUSINESS_PHONE_NUMBER_ID

    async def send_text(self, to: str, text: str):
        url = f"https://graph.facebook.com/v22.0/{self.api_url}/messages"
        headers = {"Authorization": f"Bearer {self.access_token}" , "Content-Type": "application/json"}
        data = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text}
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=data, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def download_media(self, media_id: str) -> str:
        headers = {"Authorization": f"Bearer {self.access_token}"}
        media_url_endpoint = f"https://graph.facebook.com/v22.0/{media_id}"

        async with httpx.AsyncClient() as client:
            # Step 1: get media URL
            resp = await client.get(media_url_endpoint, headers=headers)
            resp.raise_for_status()
            media_url = resp.json().get("url")

            # Step 2: download media content
            audio_resp = await client.get(media_url, headers=headers)
            audio_resp.raise_for_status()

            # Save to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
                tmp.write(audio_resp.content)
                return tmp.name
