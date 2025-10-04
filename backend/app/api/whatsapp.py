from fastapi import APIRouter, Request, HTTPException, status
from app.core.config import settings
from app.services.message_service import process_text_message

router = APIRouter()

# Verify webhook (GET)
@router.get("/webhook")
async def verify_webhook(mode: str, verify_token: str, challenge: str):
    if verify_token == settings.VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid verify token")

# Receive messages (POST)
@router.post("/webhook")
async def receive_message(request: Request):
    payload = await request.json()
    
    # WhatsApp may batch messages, so iterate if needed
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            msg = change.get("value", {}).get("messages", [])
            for message in msg:
                await process_text_message(message)
    
    return {"status": "received"}
