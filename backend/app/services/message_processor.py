from app.services.whatsapp_service import WhatsAppService
from app.services.transcription_service import TranscriptionService
from app.services.nlp_service import NLPService
from app.services.reminder_service import ReminderService
from app.services.todo_service import TodoService
from app.services.note_service import NoteService
from app.services.meeting_service import MeetingService
from app.services.chatbot_service import ChatbotService
from app.services.booking_service import BookingService
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

        # Step 2: NLP processing (static method call)
        nlp_result = NLPService.parse_booking(text)

        # Step 3: Handle intent
        await MessageProcessor.handle_booking_intent(user_id, nlp_result)

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
        intent = nlp_result.get("intent")
        action = nlp_result.get("action")
        time = nlp_result.get("time")
        raw = nlp_result.get("raw")

        if intent == "reminder":
            await ReminderService.create_reminder(user_id, action, time)
            await whatsapp_service.send_text(
                user_id,
                f"Got it! I'll remind you to {action} at {time[11:16]}."
            )
        elif intent == "todo":
            await TodoService.create_todo(user_id, action)
            await whatsapp_service.send_text(
                user_id, f"Todo created: {action}"
            )
        elif intent == "note":
            await NoteService.create_note(user_id, action)
            await whatsapp_service.send_text(
                user_id, f"Noted: {action}"
            )
        elif intent == "meeting":
            await MeetingService.create_meeting(user_id, action, time)
            await whatsapp_service.send_text(
                user_id, f"Meeting scheduled: {action} at {time[11:16]}"
            )
        else:
            # Anything else goes to chatbot
            reply = await ChatbotService.ask(user_id, raw)
            await whatsapp_service.send_text(user_id, reply)

    @staticmethod
    async def handle_booking_intent(user_id: str, nlp_result: dict):
        """
        Handle only booking intents.
        If not a booking, send to chat.
        """
        intent = nlp_result.get("intent")
        action = nlp_result.get("action")
        time = nlp_result.get("time")
        raw = nlp_result.get("raw")

        if intent == "booking":
            # Here you would normally call a booking service
            await BookingService.process_book(user_id, action, time)
            await whatsapp_service.send_text(
                user_id,
                "Great! I can help you book your train ticket to Ella.\n\n"
                "Train: Udarata Menike (Colombo → Ella)\n"
                "Date: Wednesday, 16th Oct 2025\n"
                "Class: 1st Class\n"
                "Departure: 07:30 AM\n"
                "Passengers: 1\n\n"
                "Click here to confirm and pay your ticket: https://govtrain.lk/book?train=UdarataMenike&date=2025-10-16&class=1st&time=07:30\n\n"
                "Note: This link is valid for **1 hour** only.\n\n"
                "Instructions:\n"
                "1. Click the link above.\n"
                "2. Verify passenger details and select seat if needed.\n"
                "3. Complete the payment using your preferred method.\n"
                "4. Keep the ticket receipt safe — you’ll need it at the station.\n\n"
                "Tip: Arrive at the station at least 15 minutes before departure.\n\n"
                "\n"
                "Do you want me to set a reminder for your journey one day before?"
            )
        else:
            # Anything else goes to chatbot
            reply = await ChatbotService.ask(user_id, raw)
            await whatsapp_service.send_text(user_id, reply)

