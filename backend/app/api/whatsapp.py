from fastapi import APIRouter, Request, HTTPException, status
from app.core.config import settings
from app.services.message_processor import MessageProcessor
from app.services.whatsapp_service import WhatsAppService

router = APIRouter()
processor = MessageProcessor()
whatsapp_service = WhatsAppService()

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
                await processor.process_message(message)
    return {"status": "received"}

@router.post("/send-message")
async def send_message(request: Request):
    """
    Endpoint for n8n to send messages via WhatsApp
    """
    data = await request.json()
    user_id = data.get("user_id")
    text = data.get("text")

    if not user_id or not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id and text are required")

    await whatsapp_service.send_text(user_id, text)
    return {"status": "success", "user_id": user_id}

