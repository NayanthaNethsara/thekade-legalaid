import pytest
from unittest.mock import Mock, patch, MagicMock
import os
from app.services.transcription_service import TranscriptionService


class TestTranscriptionService:
    """Test cases for transcription service functionality."""

    @pytest.fixture
    def transcription_service(self):
        """Create a transcription service instance for testing."""
        return TranscriptionService()

    @patch('app.services.transcription_service.model')
    def test_transcribe_success(self, mock_model, transcription_service, test_audio_file):
        """Test successful audio transcription."""
        # Mock the model's transcribe method
        mock_result = {"text": "This is a test transcription"}
        mock_model.transcribe.return_value = mock_result
        
        # Test the method
        result = transcription_service.transcribe(test_audio_file)
        
        # Assertions
        assert result == "This is a test transcription"
        mock_model.transcribe.assert_called_once_with(test_audio_file)

    @patch('app.services.transcription_service.model')
    def test_transcribe_empty_audio(self, mock_model, transcription_service, test_audio_file):
        """Test transcription of empty/silent audio."""
        # Mock the model to return empty text
        mock_result = {"text": ""}
        mock_model.transcribe.return_value = mock_result
        
        result = transcription_service.transcribe(test_audio_file)
        
        assert result == ""
        mock_model.transcribe.assert_called_once_with(test_audio_file)

    @patch('app.services.transcription_service.model')
    def test_transcribe_with_noise(self, mock_model, transcription_service, test_audio_file):
        """Test transcription of noisy audio."""
        # Mock the model to return partial transcription
        mock_result = {"text": " [inaudible] hello [noise] "}
        mock_model.transcribe.return_value = mock_result
        
        result = transcription_service.transcribe(test_audio_file)
        
        assert result == " [inaudible] hello [noise] "
        mock_model.transcribe.assert_called_once_with(test_audio_file)

    @patch('app.services.transcription_service.model')
    def test_transcribe_long_audio(self, mock_model, transcription_service, test_audio_file):
        """Test transcription of long audio file."""
        # Mock a long transcription result
        long_text = "This is a very long transcription " * 50
        mock_result = {"text": long_text}
        mock_model.transcribe.return_value = mock_result
        
        result = transcription_service.transcribe(test_audio_file)
        
        assert result == long_text
        assert len(result) > 1000  # Ensure it's actually long
        mock_model.transcribe.assert_called_once_with(test_audio_file)

    @patch('app.services.transcription_service.model')
    def test_transcribe_multilingual(self, mock_model, transcription_service, test_audio_file):
        """Test transcription with multiple languages."""
        # Mock transcription with mixed languages
        mock_result = {"text": "Hello, hola, bonjour, world"}
        mock_model.transcribe.return_value = mock_result
        
        result = transcription_service.transcribe(test_audio_file)
        
        assert result == "Hello, hola, bonjour, world"
        mock_model.transcribe.assert_called_once_with(test_audio_file)

    @patch('app.services.transcription_service.model')
    def test_transcribe_with_special_characters(self, mock_model, transcription_service, test_audio_file):
        """Test transcription containing special characters."""
        # Mock transcription with special characters
        mock_result = {"text": "Legal case #123: Smith vs. Jones (2024) - $50,000 settlement."}
        mock_model.transcribe.return_value = mock_result
        
        result = transcription_service.transcribe(test_audio_file)
        
        assert result == "Legal case #123: Smith vs. Jones (2024) - $50,000 settlement."
        mock_model.transcribe.assert_called_once_with(test_audio_file)

    @patch('app.services.transcription_service.model')
    def test_transcribe_file_not_found(self, mock_model, transcription_service):
        """Test transcription with non-existent file."""
        # Mock the model to raise an exception for missing file
        mock_model.transcribe.side_effect = FileNotFoundError("Audio file not found")
        
        with pytest.raises(FileNotFoundError):
            transcription_service.transcribe("/path/to/nonexistent/file.ogg")

    @patch('app.services.transcription_service.model')
    def test_transcribe_invalid_audio_format(self, mock_model, transcription_service):
        """Test transcription with invalid audio format."""
        # Mock the model to raise an exception for invalid format
        mock_model.transcribe.side_effect = Exception("Invalid audio format")
        
        with pytest.raises(Exception, match="Invalid audio format"):
            transcription_service.transcribe("/path/to/invalid/file.txt")

    @patch('app.services.transcription_service.model')
    def test_transcribe_corrupted_audio(self, mock_model, transcription_service, test_audio_file):
        """Test transcription with corrupted audio file."""
        # Mock the model to raise an exception for corrupted audio
        mock_model.transcribe.side_effect = Exception("Corrupted audio file")
        
        with pytest.raises(Exception, match="Corrupted audio file"):
            transcription_service.transcribe(test_audio_file)

    def test_transcribe_static_method(self):
        """Test that transcribe is a static method."""
        # Test that we can call transcribe without instantiating the class
        with patch('app.services.transcription_service.model') as mock_model:
            mock_result = {"text": "Static method test"}
            mock_model.transcribe.return_value = mock_result
            
            result = TranscriptionService.transcribe("test_file.ogg")
            
            assert result == "Static method test"

    @patch('app.services.transcription_service.model')
    def test_transcribe_legal_terminology(self, mock_model, transcription_service, test_audio_file):
        """Test transcription of legal terminology."""
        # Mock transcription with legal terms
        legal_text = ("According to the Motor Traffic Act, section 52, "
                     "the defendant is liable for damages. The plaintiff "
                     "seeks compensation under tort law provisions.")
        mock_result = {"text": legal_text}
        mock_model.transcribe.return_value = mock_result
        
        result = transcription_service.transcribe(test_audio_file)
        
        assert result == legal_text
        assert "Motor Traffic Act" in result
        assert "tort law" in result
        mock_model.transcribe.assert_called_once_with(test_audio_file)