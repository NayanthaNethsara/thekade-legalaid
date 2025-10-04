"""
Mock services for testing external dependencies.
"""

from typing import Any, Dict, Optional
from unittest.mock import Mock


class MockWhatsAppService:
    """Mock WhatsApp service for testing."""

    def __init__(self):
        self.sent_messages = []
        self.downloaded_media = {}
        self.should_fail_send = False
        self.should_fail_download = False

    async def send_text(self, to: str, text: str) -> Dict[str, Any]:
        """Mock text message sending."""
        if self.should_fail_send:
            raise Exception("Mock send failure")

        message_data = {
            "to": to,
            "text": text,
            "timestamp": "1634567890",
            "id": f"wamid.mock_{len(self.sent_messages)}",
        }
        self.sent_messages.append(message_data)

        return {
            "messaging_product": "whatsapp",
            "messages": [{"id": message_data["id"]}],
        }

    async def download_media(self, media_id: str) -> str:
        """Mock media download."""
        if self.should_fail_download:
            raise Exception("Mock download failure")

        # Simulate file download
        file_path = f"/tmp/mock_audio_{media_id}.ogg"
        self.downloaded_media[media_id] = file_path
        return file_path

    def verify_webhook(self, verify_token: str) -> bool:
        """Mock webhook verification."""
        return verify_token == "test_verify_token"

    def reset(self):
        """Reset mock state."""
        self.sent_messages = []
        self.downloaded_media = {}
        self.should_fail_send = False
        self.should_fail_download = False


class MockTranscriptionService:
    """Mock transcription service for testing."""

    def __init__(self):
        self.transcriptions = {}
        self.default_transcription = "Mock transcription result"
        self.should_fail = False

    def transcribe(self, file_path: str) -> str:
        """Mock audio transcription."""
        if self.should_fail:
            raise Exception("Mock transcription failure")

        # Return pre-configured transcription or default
        return self.transcriptions.get(file_path, self.default_transcription)

    def set_transcription(self, file_path: str, transcription: str):
        """Set mock transcription for specific file."""
        self.transcriptions[file_path] = transcription

    def reset(self):
        """Reset mock state."""
        self.transcriptions = {}
        self.should_fail = False


class MockHttpClient:
    """Mock HTTP client for testing external API calls."""

    def __init__(self):
        self.requests = []
        self.responses = {}
        self.default_response = Mock()
        self.default_response.json.return_value = {"mock": "response"}
        self.default_response.raise_for_status.return_value = None

    async def post(self, url: str, **kwargs) -> Mock:
        """Mock POST request."""
        request_data = {"method": "POST", "url": url, "kwargs": kwargs}
        self.requests.append(request_data)

        return self.responses.get(url, self.default_response)

    async def get(self, url: str, **kwargs) -> Mock:
        """Mock GET request."""
        request_data = {"method": "GET", "url": url, "kwargs": kwargs}
        self.requests.append(request_data)

        return self.responses.get(url, self.default_response)

    def set_response(self, url: str, response: Mock):
        """Set mock response for specific URL."""
        self.responses[url] = response

    def reset(self):
        """Reset mock state."""
        self.requests = []
        self.responses = {}


class MockAudioFile:
    """Mock audio file for testing."""

    def __init__(self, file_path: str, content: bytes = b"mock audio content"):
        self.file_path = file_path
        self.content = content
        self.exists = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def write(self, data: bytes):
        """Mock file write."""
        self.content = data

    @property
    def name(self) -> str:
        """Return file path."""
        return self.file_path


class MockEnvironment:
    """Mock environment variables for testing."""

    def __init__(self):
        self.env_vars = {
            "WHATSAPP_ACCESS_TOKEN": "mock_access_token",
            "WHATSAPP_PHONE_NUMBER_ID": "mock_phone_id",
            "WHATSAPP_VERIFY_TOKEN": "test_verify_token",
            "DEBUG": "true",
            "TEMP_AUDIO_DIR": "/tmp/test_audio",
        }

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get environment variable."""
        return self.env_vars.get(key, default)

    def set(self, key: str, value: str):
        """Set environment variable."""
        self.env_vars[key] = value

    def reset(self):
        """Reset to default values."""
        self.__init__()


# Global mock instances for reuse
mock_whatsapp_service = MockWhatsAppService()
mock_transcription_service = MockTranscriptionService()
mock_http_client = MockHttpClient()
mock_environment = MockEnvironment()
