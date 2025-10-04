from fastapi import APIRouter, Request, HTTPException, status
from app.core.config import settings
from app.services.message_processor import MessageProcessor

router = APIRouter()
processor = MessageProcessor()

@router.get("/webhook")
async def verify_webhook(mode: str, verify_token: str, challenge: str):
    if verify_token == settings.VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid verify token")

@router.post("/webhook")
async def receive_message(request: Request):
    payload = await request.json()
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            messages = change.get("value", {}).get("messages", [])
            for message in messages:
                msg_type = message.get("type")
                if msg_type == "text":
                    await processor.process_text_message(message)
                elif msg_type == "audio":
                    await processor.process_voice_message(message)
    return {"status": "received"}
