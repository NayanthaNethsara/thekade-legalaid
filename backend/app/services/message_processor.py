from app.services.whatsapp_service import WhatsAppService
from app.services.transcription_service import TranscriptionService
from app.services.nlp_service import NLPService
from app.services.reminder_service import ReminderService
import os

whatsapp_service = WhatsAppService()
transcription_service = TranscriptionService()

class MessageProcessor:

    @staticmethod
    async def process_message(message: dict):
        """
        Main entry for any incoming WhatsApp message (text or voice)
        """
        msg_type = message.get("type")
        user_id = message.get("from")

        # Step 1: Extract text
        if msg_type == "text":
            text = message.get("text", {}).get("body")
        elif msg_type == "audio":
            text = await MessageProcessor.voice_to_text(message)
        else:
            # Unsupported type
            await whatsapp_service.send_text(
                user_id,
                f"Sorry, I only process text and voice messages for now. You sent a {msg_type}."
            )
            return

        if not text:
            return

        print(f"Message from {user_id}: {text}")

        # Step 2: NLP processing
        nlp_result = NLPService.parse_message(text)

        # Step 3: Handle intent
        await MessageProcessor.handle_intent(user_id, nlp_result)

    @staticmethod
    async def voice_to_text(message: dict):
        """
        Download audio, transcribe, and delete temp file
        """
        user_id = message.get("from")
        media_id = message.get("audio", {}).get("id")
        if not media_id:
            return None

        audio_file_path = await whatsapp_service.download_media(media_id)
        text = transcription_service.transcribe(audio_file_path)
        os.remove(audio_file_path)
        return text

    @staticmethod
    async def handle_intent(user_id: str, nlp_result: dict):
        """
        Handle structured NLP result: send to n8n, WhatsApp reply, etc.
        """
        intent = nlp_result.get("intent")

        if intent == "reminder":
            await ReminderService.create_reminder(
                user_id=user_id,
                text=nlp_result["action"],
                time=nlp_result["time"]
            )
            await whatsapp_service.send_text(
                user_id,
                f"Got it! I'll remind you to {nlp_result['action']} at {nlp_result['time'][11:16]}."
            )
        elif intent == "question":
            await whatsapp_service.send_text(user_id, "I see you have a question. I'll answer it soon!")
        else:
            await whatsapp_service.send_text(user_id, f"You said: {nlp_result.get('text')}")
