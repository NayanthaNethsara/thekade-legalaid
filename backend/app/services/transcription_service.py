import whisper

# Load model once globally
model = whisper.load_model("small.en")


class TranscriptionService:
    @staticmethod
    def transcribe(file_path: str) -> str:
        result = model.transcribe(file_path)
        # Cleanup if needed (for temp file)
        return result["text"]
