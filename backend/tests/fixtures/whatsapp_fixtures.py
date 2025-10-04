"""
Test fixtures for WhatsApp messages and related data structures.
"""

from datetime import datetime
from typing import Any, Dict

import factory


class WhatsAppMessageFactory(factory.Factory):
    """Factory for creating WhatsApp message test data."""

    class Meta:
        model = dict

    from_number = "1234567890"
    message_id = factory.Sequence(lambda n: f"wamid.test{n}")
    timestamp = factory.LazyFunction(lambda: str(int(datetime.now().timestamp())))
    type = "text"

    @factory.lazy_attribute
    def text(self):
        if self.type == "text":
            return {"body": "Test message content"}
        return None

    @factory.lazy_attribute
    def audio(self):
        if self.type == "audio":
            return {
                "id": f"audio_{self.message_id}",
                "mime_type": "audio/ogg; codecs=opus",
            }
        return None


class WhatsAppWebhookFactory(factory.Factory):
    """Factory for creating WhatsApp webhook payloads."""

    class Meta:
        model = dict

    object = "whatsapp_business_account"

    @factory.lazy_attribute
    def entry(self):
        return [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "1234567890",
                                "phone_number_id": "123456789",
                            },
                            "messages": (
                                [self.message] if hasattr(self, "message") else []
                            ),
                        },
                        "field": "messages",
                    }
                ],
            }
        ]

    @classmethod
    def with_text_message(cls, text_content: str = "Test message") -> Dict[str, Any]:
        """Create webhook payload with a text message."""
        message = WhatsAppMessageFactory(type="text", text={"body": text_content})
        return cls(message=message)

    @classmethod
    def with_voice_message(cls, audio_id: str = "audio123") -> Dict[str, Any]:
        """Create webhook payload with a voice message."""
        message = WhatsAppMessageFactory(
            type="audio", audio={"id": audio_id, "mime_type": "audio/ogg; codecs=opus"}
        )
        return cls(message=message)

    @classmethod
    def with_multiple_messages(cls, messages: list) -> Dict[str, Any]:
        """Create webhook payload with multiple messages."""
        return {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "123456789",
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {
                                    "display_phone_number": "1234567890",
                                    "phone_number_id": "123456789",
                                },
                                "messages": messages,
                            },
                            "field": "messages",
                        }
                    ],
                }
            ],
        }

    @classmethod
    def empty_payload(cls) -> Dict[str, Any]:
        """Create empty webhook payload."""
        return {"object": "whatsapp_business_account", "entry": []}


class LegalQueryFactory(factory.Factory):
    """Factory for creating legal query test data."""

    class Meta:
        model = dict

    queries = [
        "What are my rights in a traffic violation case?",
        "How do I file an appeal for a traffic fine?",
        "What is the penalty for speeding?",
        "Can I represent myself in court?",
        "What documents do I need for a license appeal?",
        "How long do I have to pay a traffic fine?",
        "What happens if I don't appear in court?",
        "Can I get legal aid for a traffic case?",
        "What is the difference between a citation and a summons?",
        "How do I check if my license is suspended?",
    ]

    @classmethod
    def random_query(cls) -> str:
        """Return a random legal query."""
        import random

        return random.choice(cls.queries)

    @classmethod
    def traffic_law_query(cls) -> str:
        """Return a traffic law specific query."""
        traffic_queries = [
            q
            for q in cls.queries
            if any(
                word in q.lower() for word in ["traffic", "speeding", "license", "fine"]
            )
        ]
        import random

        return random.choice(traffic_queries)


class TranscriptionResponseFactory(factory.Factory):
    """Factory for creating transcription response test data."""

    class Meta:
        model = dict

    @classmethod
    def legal_transcription(cls) -> str:
        """Return a legal-themed transcription."""
        transcriptions = [
            "I need help with a traffic violation I received last week",
            "Can you explain the Motor Traffic Act section 52?",
            "I want to appeal my speeding ticket",
            "What are the penalties for driving without a license?",
            "I got into an accident, what should I do?",
            "How do I file a complaint against a police officer?",
            "My license was suspended, how do I get it back?",
            "I need legal representation for my court case",
        ]
        import random

        return random.choice(transcriptions)

    @classmethod
    def unclear_transcription(cls) -> str:
        """Return an unclear or noisy transcription."""
        return "[inaudible] help with [noise] traffic case [unclear]"

    @classmethod
    def empty_transcription(cls) -> str:
        """Return empty transcription."""
        return ""

    @classmethod
    def long_transcription(cls) -> str:
        """Return a long transcription."""
        return (
            "I was driving on the highway yesterday when I got pulled over "
            "by a police officer who said I was speeding. I don't think I was "
            "going over the speed limit, but he gave me a ticket anyway. "
            "I want to know what my options are for fighting this ticket "
            "and whether I need a lawyer. The fine is quite expensive and "
            "I'm worried about points on my license. Can you help me understand "
            "the legal process and what I should do next?"
        )


class ApiResponseFactory(factory.Factory):
    """Factory for creating API response test data."""

    class Meta:
        model = dict

    @classmethod
    def whatsapp_send_success(
        cls, message_id: str = "wamid.success123"
    ) -> Dict[str, Any]:
        """Return successful WhatsApp send response."""
        return {"messaging_product": "whatsapp", "messages": [{"id": message_id}]}

    @classmethod
    def whatsapp_media_info(
        cls, media_url: str = "https://example.com/media.ogg"
    ) -> Dict[str, Any]:
        """Return WhatsApp media info response."""
        return {
            "url": media_url,
            "mime_type": "audio/ogg; codecs=opus",
            "sha256": "test_hash",
            "file_size": 12345,
            "id": "media123",
        }

    @classmethod
    def error_response(
        cls, error_code: int = 400, error_message: str = "Bad Request"
    ) -> Dict[str, Any]:
        """Return error response."""
        return {
            "error": {
                "code": error_code,
                "message": error_message,
                "type": "OAuthException",
            }
        }
