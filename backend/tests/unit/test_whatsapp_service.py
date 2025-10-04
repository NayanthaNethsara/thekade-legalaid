import pytest
from unittest.mock import Mock, AsyncMock, patch, mock_open
import httpx
import tempfile
from app.services.whatsapp_service import WhatsAppService


class TestWhatsAppService:
    """Test cases for WhatsApp service functionality."""

    @pytest.fixture
    def whatsapp_service(self):
        """Create a WhatsApp service instance for testing."""
        return WhatsAppService()

    @pytest.mark.asyncio
    async def test_send_text_success(self, whatsapp_service):
        """Test successful text message sending."""
        with patch('httpx.AsyncClient') as mock_client:
            # Mock the response
            mock_response = Mock()
            mock_response.json.return_value = {"messages": [{"id": "wamid.test123"}]}
            mock_response.raise_for_status.return_value = None
            
            # Configure the mock client
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            
            # Test the method
            result = await whatsapp_service.send_text("1234567890", "Test message")
            
            # Assertions
            assert result == {"messages": [{"id": "wamid.test123"}]}
            mock_client_instance.post.assert_called_once()
            
            # Verify the call arguments
            call_args = mock_client_instance.post.call_args
            assert "messages" in call_args[1]["json"]
            assert call_args[1]["json"]["text"]["body"] == "Test message"
            assert call_args[1]["json"]["to"] == "1234567890"

    @pytest.mark.asyncio
    async def test_send_text_http_error(self, whatsapp_service):
        """Test text message sending with HTTP error."""
        with patch('httpx.AsyncClient') as mock_client:
            # Mock the response to raise an HTTP error
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "400 Bad Request", request=Mock(), response=Mock()
            )
            
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            
            # Test that the method raises the HTTP error
            with pytest.raises(httpx.HTTPStatusError):
                await whatsapp_service.send_text("1234567890", "Test message")

    @pytest.mark.asyncio
    async def test_download_media_success(self, whatsapp_service):
        """Test successful media download."""
        with patch('httpx.AsyncClient') as mock_client, \
             patch('tempfile.NamedTemporaryFile') as mock_temp_file:
            
            # Mock the media URL response
            mock_url_response = Mock()
            mock_url_response.json.return_value = {"url": "https://example.com/media.ogg"}
            mock_url_response.raise_for_status.return_value = None
            
            # Mock the media content response
            mock_content_response = Mock()
            mock_content_response.content = b"fake audio content"
            mock_content_response.raise_for_status.return_value = None
            
            # Configure the mock client
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=[mock_url_response, mock_content_response])
            
            # Mock the temporary file
            mock_file = Mock()
            mock_file.name = "/tmp/test_audio.ogg"
            mock_temp_file.return_value.__enter__.return_value = mock_file
            
            # Test the method
            result = await whatsapp_service.download_media("media123")
            
            # Assertions
            assert result == "/tmp/test_audio.ogg"
            assert mock_client_instance.get.call_count == 2
            mock_file.write.assert_called_once_with(b"fake audio content")

    @pytest.mark.asyncio
    async def test_download_media_url_fetch_error(self, whatsapp_service):
        """Test media download with URL fetch error."""
        with patch('httpx.AsyncClient') as mock_client:
            # Mock the response to raise an HTTP error
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "404 Not Found", request=Mock(), response=Mock()
            )
            
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            
            # Test that the method raises the HTTP error
            with pytest.raises(httpx.HTTPStatusError):
                await whatsapp_service.download_media("invalid_media_id")

    @pytest.mark.asyncio
    async def test_download_media_content_fetch_error(self, whatsapp_service):
        """Test media download with content fetch error."""
        with patch('httpx.AsyncClient') as mock_client:
            # Mock successful URL response
            mock_url_response = Mock()
            mock_url_response.json.return_value = {"url": "https://example.com/media.ogg"}
            mock_url_response.raise_for_status.return_value = None
            
            # Mock failed content response
            mock_content_response = Mock()
            mock_content_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "403 Forbidden", request=Mock(), response=Mock()
            )
            
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=[mock_url_response, mock_content_response])
            
            # Test that the method raises the HTTP error
            with pytest.raises(httpx.HTTPStatusError):
                await whatsapp_service.download_media("media123")

    def test_whatsapp_service_initialization(self, whatsapp_service):
        """Test WhatsApp service initialization."""
        assert whatsapp_service.access_token is not None
        assert whatsapp_service.api_url is not None

    @pytest.mark.asyncio
    async def test_send_text_with_special_characters(self, whatsapp_service):
        """Test sending text with special characters."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.json.return_value = {"messages": [{"id": "wamid.test123"}]}
            mock_response.raise_for_status.return_value = None
            
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            
            special_text = "Hello! 🤖 This is a test with émojis and spéciál characters."
            result = await whatsapp_service.send_text("1234567890", special_text)
            
            assert result == {"messages": [{"id": "wamid.test123"}]}
            
            # Verify the special characters are preserved
            call_args = mock_client_instance.post.call_args
            assert call_args[1]["json"]["text"]["body"] == special_text

    @pytest.mark.asyncio
    async def test_send_text_empty_message(self, whatsapp_service):
        """Test sending empty text message."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.json.return_value = {"messages": [{"id": "wamid.test123"}]}
            mock_response.raise_for_status.return_value = None
            
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            
            result = await whatsapp_service.send_text("1234567890", "")
            
            assert result == {"messages": [{"id": "wamid.test123"}]}
            
            call_args = mock_client_instance.post.call_args
            assert call_args[1]["json"]["text"]["body"] == ""