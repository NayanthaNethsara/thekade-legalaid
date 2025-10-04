import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json

from app.main import app


class TestWhatsAppWebhook:
    """Integration tests for WhatsApp webhook endpoints."""

    @pytest.fixture
    def client(self):
        """FastAPI test client."""
        return TestClient(app)

    def test_verify_webhook_success(self, client):
        """Test successful webhook verification."""
        response = client.get(
            "/webhook",
            params={
                "mode": "subscribe",
                "verify_token": "test_verify_token",
                "challenge": "1234567890"
            }
        )
        
        assert response.status_code == 200
        assert response.json() == 1234567890

    def test_verify_webhook_invalid_token(self, client):
        """Test webhook verification with invalid token."""
        response = client.get(
            "/webhook",
            params={
                "mode": "subscribe",
                "verify_token": "invalid_token",
                "challenge": "1234567890"
            }
        )
        
        assert response.status_code == 403
        assert response.json()["detail"] == "Invalid verify token"

    def test_verify_webhook_missing_params(self, client):
        """Test webhook verification with missing parameters."""
        response = client.get("/webhook")
        
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_receive_message_text(self, client, sample_whatsapp_message):
        """Test receiving a WhatsApp text message."""
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = client.post(
                "/webhook",
                json=sample_whatsapp_message
            )
            
            assert response.status_code == 200
            assert response.json() == {"status": "received"}
            
            # Verify that process_message was called
            mock_process.assert_called_once()

    @pytest.mark.asyncio
    async def test_receive_message_voice(self, client, sample_voice_message):
        """Test receiving a WhatsApp voice message."""
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = client.post(
                "/webhook",
                json=sample_voice_message
            )
            
            assert response.status_code == 200
            assert response.json() == {"status": "received"}
            
            # Verify that process_message was called
            mock_process.assert_called_once()

    @pytest.mark.asyncio
    async def test_receive_message_multiple_messages(self, client):
        """Test receiving multiple messages in one webhook call."""
        payload = {
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
                                    "phone_number_id": "123456789"
                                },
                                "messages": [
                                    {
                                        "from": "1234567890",
                                        "id": "wamid.test1",
                                        "timestamp": "1634567890",
                                        "text": {"body": "First message"},
                                        "type": "text"
                                    },
                                    {
                                        "from": "1234567890",
                                        "id": "wamid.test2",
                                        "timestamp": "1634567891",
                                        "text": {"body": "Second message"},
                                        "type": "text"
                                    }
                                ]
                            },
                            "field": "messages"
                        }
                    ]
                }
            ]
        }
        
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = client.post("/webhook", json=payload)
            
            assert response.status_code == 200
            assert response.json() == {"status": "received"}
            
            # Verify that process_message was called twice
            assert mock_process.call_count == 2

    @pytest.mark.asyncio
    async def test_receive_message_empty_payload(self, client):
        """Test receiving empty webhook payload."""
        payload = {}
        
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = client.post("/webhook", json=payload)
            
            assert response.status_code == 200
            assert response.json() == {"status": "received"}
            
            # process_message should not be called for empty payload
            mock_process.assert_not_called()

    @pytest.mark.asyncio
    async def test_receive_message_no_messages(self, client):
        """Test webhook with no messages in payload."""
        payload = {
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
                                    "phone_number_id": "123456789"
                                }
                                # No "messages" field
                            },
                            "field": "messages"
                        }
                    ]
                }
            ]
        }
        
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = client.post("/webhook", json=payload)
            
            assert response.status_code == 200
            assert response.json() == {"status": "received"}
            
            # process_message should not be called when no messages
            mock_process.assert_not_called()

    @pytest.mark.asyncio
    async def test_receive_message_processing_error(self, client, sample_whatsapp_message):
        """Test webhook when message processing fails."""
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.side_effect = Exception("Processing failed")
            
            # The current implementation doesn't catch exceptions, so it will raise the exception
            # We expect this to result in a 500 status code
            try:
                response = client.post("/webhook", json=sample_whatsapp_message)
                # If we get here, the test failed because it should have raised an exception
                assert False, "Expected an exception to be raised"
            except Exception as e:
                # This is expected behavior - the exception propagates up
                assert "Processing failed" in str(e)

    def test_receive_message_invalid_json(self, client):
        """Test webhook with invalid JSON payload."""
        # The current implementation doesn't handle JSON parsing errors, so it will raise an exception
        try:
            response = client.post(
                "/webhook",
                content="invalid json",
                headers={"Content-Type": "application/json"}
            )
            # If we get here, the test failed because it should have raised an exception
            assert False, "Expected a JSON decode error to be raised"
        except Exception as e:
            # This is expected behavior - JSON parsing fails
            assert "JSON" in str(type(e).__name__) or "Expecting value" in str(e)

    @pytest.mark.asyncio
    async def test_receive_message_status_update(self, client):
        """Test receiving WhatsApp status update (not a message)."""
        status_payload = {
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
                                    "phone_number_id": "123456789"
                                },
                                "statuses": [
                                    {
                                        "id": "wamid.test123",
                                        "status": "delivered",
                                        "timestamp": "1634567890",
                                        "recipient_id": "1234567890"
                                    }
                                ]
                            },
                            "field": "messages"
                        }
                    ]
                }
            ]
        }
        
        with patch('app.services.message_processor.MessageProcessor.process_message') as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = client.post("/webhook", json=status_payload)
            
            assert response.status_code == 200
            assert response.json() == {"status": "received"}
            
            # Should not process status updates as messages
            mock_process.assert_not_called()

    def test_webhook_get_method_requires_params(self, client):
        """Test that GET webhook endpoint requires all parameters."""
        # Test missing mode
        response = client.get("/webhook", params={
            "verify_token": "test_verify_token",
            "challenge": "1234567890"
        })
        assert response.status_code == 422

        # Test missing verify_token
        response = client.get("/webhook", params={
            "mode": "subscribe",
            "challenge": "1234567890"
        })
        assert response.status_code == 422

        # Test missing challenge
        response = client.get("/webhook", params={
            "mode": "subscribe",
            "verify_token": "test_verify_token"
        })
        assert response.status_code == 422