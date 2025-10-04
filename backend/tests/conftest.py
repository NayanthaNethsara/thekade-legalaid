import asyncio
import os
import sys
from typing import Generator
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient

# Set test environment variables before importing app modules
os.environ["WHATSAPP_ACCESS_TOKEN"] = "test_token"
os.environ["BUSINESS_PHONE_NUMBER_ID"] = "test_phone_id"
os.environ["VERIFY_TOKEN"] = "test_verify_token"
os.environ["DEBUG"] = "true"

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

# Import after path setup to avoid import issues
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_whatsapp_service():
    """Mock WhatsApp service for testing."""
    mock = Mock()
    mock.send_text = AsyncMock()
    mock.download_media = AsyncMock()
    mock.verify_webhook = Mock(return_value=True)
    return mock


@pytest.fixture
def mock_transcription_service():
    """Mock transcription service for testing."""
    mock = Mock()
    mock.transcribe = Mock(return_value="Test transcription")
    return mock


@pytest.fixture
def sample_whatsapp_message():
    """Sample WhatsApp message for testing."""
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
                            "messages": [
                                {
                                    "from": "1234567890",
                                    "id": "wamid.test123",
                                    "timestamp": "1634567890",
                                    "text": {"body": "Hello, test message"},
                                    "type": "text",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }


@pytest.fixture
def sample_voice_message():
    """Sample voice message for testing."""
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
                            "messages": [
                                {
                                    "from": "1234567890",
                                    "id": "wamid.voice123",
                                    "timestamp": "1634567890",
                                    "audio": {
                                        "id": "audio123",
                                        "mime_type": "audio/ogg; codecs=opus",
                                    },
                                    "type": "audio",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }


@pytest.fixture
def test_audio_file(tmp_path):
    """Create a temporary audio file for testing."""
    audio_file = tmp_path / "test_audio.ogg"
    audio_file.write_bytes(b"fake audio content")
    return str(audio_file)


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "test_token")
    monkeypatch.setenv("BUSINESS_PHONE_NUMBER_ID", "test_phone_id")
    monkeypatch.setenv("VERIFY_TOKEN", "test_verify_token")
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("TEMP_AUDIO_DIR", "/tmp/test_audio")


@pytest.fixture
def mock_os_remove(monkeypatch):
    """Mock os.remove to prevent actual file deletion in tests."""
    mock_remove = Mock()
    monkeypatch.setattr("os.remove", mock_remove)
    return mock_remove
