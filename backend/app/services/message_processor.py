from app.services.whatsapp_service import WhatsAppService
from app.services.transcription_service import TranscriptionService
import os

whatsapp_service = WhatsAppService()
transcription_service = TranscriptionService()

class MessageProcessor:
    @staticmethod
    async def process_message(message: dict):
        msg_type = message.get("type")
        user_id = message.get("from")

        if msg_type == "text":
            await MessageProcessor.process_text_message(message)
        elif msg_type == "audio":
            await MessageProcessor.process_voice_message(message)
        else:
            # Unsupported message type
            print(f"Unsupported message type from {user_id}: {msg_type}")
            await WhatsAppService().send_text(
                user_id,
                f"Sorry, I only process text and voice messages for now. You sent a {msg_type}."
            )
    @staticmethod
    async def process_text_message(message: dict):
        user_id = message.get("from")
        text = message.get("text", {}).get("body")
        if not text:
            return
        print(f"Text from {user_id}: {text}")
        await whatsapp_service.send_text(user_id, f"You said: {text}")

    @staticmethod
    async def process_voice_message(message: dict):
        user_id = message.get("from")
        media_id = message.get("audio", {}).get("id")
        if not media_id:
            return

        # Download and transcribe
        audio_file_path = await whatsapp_service.download_media(media_id)
        text = transcription_service.transcribe(audio_file_path)

        # Delete temp file
        os.remove(audio_file_path)

        print(f"Voice from {user_id}: {text}")
        await whatsapp_service.send_text(user_id, f"Transcription: {text}")
