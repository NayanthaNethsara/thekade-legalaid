from typing import Optional
import google.generativeai as genai
from app.core.config import settings

_configured = False

def get_client() -> genai:
    """Return a configured Gemini client. Configures once on first call."""
    global _configured
    if not _configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True
    return genai
