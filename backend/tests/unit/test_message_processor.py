from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.services.message_processor import MessageProcessor


class TestMessageProcessor:
    """Test cases for message processor functionality."""

    @pytest.mark.asyncio
    async def test_process_text_message(self):
        """Test processing of text messages."""
        with patch("app.services.message_processor.whatsapp_service") as mock_whatsapp:
            mock_whatsapp.send_text = AsyncMock()

            message = {
                "from": "1234567890",
                "type": "text",
                "text": {"body": "Hello, I need legal help"},
            }

            await MessageProcessor.process_text_message(message)

            mock_whatsapp.send_text.assert_called_once_with(
                "1234567890", "You said: Hello, I need legal help"
            )

    @pytest.mark.asyncio
    async def test_process_text_message_empty_body(self):
        """Test processing of text message with empty body."""
        with patch("app.services.message_processor.whatsapp_service") as mock_whatsapp:
            mock_whatsapp.send_text = AsyncMock()

            message = {"from": "1234567890", "type": "text", "text": {"body": ""}}

            await MessageProcessor.process_text_message(message)

            # Should not send any message for empty text
            mock_whatsapp.send_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_text_message_no_text_field(self):
        """Test processing of malformed text message."""
        with patch("app.services.message_processor.whatsapp_service") as mock_whatsapp:
            mock_whatsapp.send_text = AsyncMock()

            message = {
                "from": "1234567890",
                "type": "text",
                # Missing "text" field
            }

            await MessageProcessor.process_text_message(message)

            # Should not send any message for malformed message
            mock_whatsapp.send_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_voice_message_success(self, mock_os_remove):
        """Test successful processing of voice messages."""
        with patch(
            "app.services.message_processor.whatsapp_service"
        ) as mock_whatsapp, patch(
            "app.services.message_processor.transcription_service"
        ) as mock_transcription:

            mock_whatsapp.download_media = AsyncMock(return_value="/tmp/test_audio.ogg")
            mock_whatsapp.send_text = AsyncMock()
            mock_transcription.transcribe.return_value = (
                "I need help with a traffic violation"
            )

            message = {
                "from": "1234567890",
                "type": "audio",
                "audio": {"id": "audio123"},
            }

            await MessageProcessor.process_voice_message(message)

            # Verify the flow
            mock_whatsapp.download_media.assert_called_once_with("audio123")
            mock_transcription.transcribe.assert_called_once_with("/tmp/test_audio.ogg")
            mock_whatsapp.send_text.assert_called_once_with(
                "1234567890", "Transcription: I need help with a traffic violation"
            )
            mock_os_remove.assert_called_once_with("/tmp/test_audio.ogg")

    @pytest.mark.asyncio
    async def test_process_voice_message_no_media_id(self):
        """Test processing of voice message without media ID."""
        with patch(
            "app.services.message_processor.whatsapp_service"
        ) as mock_whatsapp, patch(
            "app.services.message_processor.transcription_service"
        ) as mock_transcription:

            mock_whatsapp.download_media = AsyncMock()
            mock_whatsapp.send_text = AsyncMock()
            mock_transcription.transcribe = Mock()

            message = {
                "from": "1234567890",
                "type": "audio",
                "audio": {},  # Missing "id" field
            }

            await MessageProcessor.process_voice_message(message)

            # Should not process anything without media ID
            mock_whatsapp.download_media.assert_not_called()
            mock_transcription.transcribe.assert_not_called()
            mock_whatsapp.send_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_voice_message_no_audio_field(self):
        """Test processing of malformed voice message."""
        with patch(
            "app.services.message_processor.whatsapp_service"
        ) as mock_whatsapp, patch(
            "app.services.message_processor.transcription_service"
        ) as mock_transcription:

            mock_whatsapp.download_media = AsyncMock()
            mock_whatsapp.send_text = AsyncMock()
            mock_transcription.transcribe = Mock()

            message = {
                "from": "1234567890",
                "type": "audio",
                # Missing "audio" field
            }

            await MessageProcessor.process_voice_message(message)

            # Should not process anything without audio field
            mock_whatsapp.download_media.assert_not_called()
            mock_transcription.transcribe.assert_not_called()
            mock_whatsapp.send_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_message_text_type(self):
        """Test process_message method with text message."""
        with patch.object(
            MessageProcessor, "process_text_message"
        ) as mock_process_text:
            mock_process_text.return_value = AsyncMock()

            message = {"from": "1234567890", "type": "text", "text": {"body": "Hello"}}

            await MessageProcessor.process_message(message)

            mock_process_text.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_process_message_audio_type(self):
        """Test process_message method with audio message."""
        with patch.object(
            MessageProcessor, "process_voice_message"
        ) as mock_process_voice:
            mock_process_voice.return_value = AsyncMock()

            message = {
                "from": "1234567890",
                "type": "audio",
                "audio": {"id": "audio123"},
            }

            await MessageProcessor.process_message(message)

            mock_process_voice.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_process_message_unsupported_type(self):
        """Test process_message method with unsupported message type."""
        with patch(
            "app.services.message_processor.WhatsAppService"
        ) as mock_whatsapp_class:
            mock_whatsapp_instance = Mock()
            mock_whatsapp_instance.send_text = AsyncMock()
            mock_whatsapp_class.return_value = mock_whatsapp_instance

            message = {"from": "1234567890", "type": "image"}  # Unsupported type

            await MessageProcessor.process_message(message)

            expected_message = (
                "Sorry, I only process text and voice messages for now. "
                "You sent a image."
            )
            mock_whatsapp_instance.send_text.assert_called_once_with(
                "1234567890", expected_message
            )

    @pytest.mark.asyncio
    async def test_process_message_no_type_field(self):
        """Test process_message method with missing type field."""
        with patch(
            "app.services.message_processor.WhatsAppService"
        ) as mock_whatsapp_class:
            mock_whatsapp_instance = Mock()
            mock_whatsapp_instance.send_text = AsyncMock()
            mock_whatsapp_class.return_value = mock_whatsapp_instance

            message = {
                "from": "1234567890"
                # Missing "type" field
            }

            await MessageProcessor.process_message(message)

            expected_message = (
                "Sorry, I only process text and voice messages for now. "
                "You sent a None."
            )
            mock_whatsapp_instance.send_text.assert_called_once_with(
                "1234567890", expected_message
            )

    @pytest.mark.asyncio
    async def test_process_voice_message_transcription_error(self):
        """Test voice message processing with transcription error."""
        with patch(
            "app.services.message_processor.whatsapp_service"
        ) as mock_whatsapp, patch(
            "app.services.message_processor.transcription_service"
        ) as mock_transcription, patch(
            "os.remove"
        ) as mock_remove:

            mock_whatsapp.download_media = AsyncMock(return_value="/tmp/test_audio.ogg")
            mock_whatsapp.send_text = AsyncMock()
            mock_transcription.transcribe.side_effect = Exception(
                "Transcription failed"
            )

            message = {
                "from": "1234567890",
                "type": "audio",
                "audio": {"id": "audio123"},
            }

            # Should raise the transcription error
            with pytest.raises(Exception, match="Transcription failed"):
                await MessageProcessor.process_voice_message(message)

            # In the current implementation, os.remove is not called if
            # transcription fails. This is a potential file leak that should be fixed
            mock_remove.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_voice_message_download_error(self):
        """Test voice message processing with download error."""
        with patch(
            "app.services.message_processor.whatsapp_service"
        ) as mock_whatsapp, patch(
            "app.services.message_processor.transcription_service"
        ) as mock_transcription:

            mock_whatsapp.download_media = AsyncMock(
                side_effect=Exception("Download failed")
            )
            mock_whatsapp.send_text = AsyncMock()
            mock_transcription.transcribe = Mock()

            message = {
                "from": "1234567890",
                "type": "audio",
                "audio": {"id": "audio123"},
            }

            # Should raise the download error
            with pytest.raises(Exception, match="Download failed"):
                await MessageProcessor.process_voice_message(message)

            # Transcription should not be called if download fails
            mock_transcription.transcribe.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_text_message_with_legal_query(self):
        """Test processing of text message with legal content."""
        with patch("app.services.message_processor.whatsapp_service") as mock_whatsapp:
            mock_whatsapp.send_text = AsyncMock()

            message = {
                "from": "1234567890",
                "type": "text",
                "text": {"body": "What are my rights in a traffic violation case?"},
            }

            await MessageProcessor.process_text_message(message)

            mock_whatsapp.send_text.assert_called_once_with(
                "1234567890",
                "You said: What are my rights in a traffic violation case?",
            )
