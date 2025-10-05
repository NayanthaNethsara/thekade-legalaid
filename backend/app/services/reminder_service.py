import os
import httpx
from app.core.config import settings

N8N_WEBHOOK_URL = settings.N8N_WEBHOOK_URL

class ReminderService:
    @staticmethod
    async def create_reminder(user_id: str, text: str, time: str):
        """
        Send reminder data to n8n webhook
        """
        if not N8N_WEBHOOK_URL:
            print("N8N webhook URL not configured.")
            return

        payload = {
            "user_id": user_id,
            "text": text,
            "time": time
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(N8N_WEBHOOK_URL, json=payload, timeout=10)
                resp.raise_for_status()
                print(f"Reminder sent to n8n for {user_id}: {text} at {time}")
            except Exception as e:
                print(f"Failed to send reminder to n8n: {e}")
