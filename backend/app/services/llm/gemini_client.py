from typing import Optional
from google import genai
from app.core.config import settings

_client: Optional[genai.Client] = None

def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client
