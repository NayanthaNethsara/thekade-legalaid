import os
from google import genai
from app.core.config import settings

_client: genai.Client | None = None

def get_client() -> genai.Client:
    """Lazy init Gemini client."""
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client

def answer_question(query: str, model: str = "gemini-2.5-flash") -> str:
    """Send plain text question to Gemini and return answer text."""
    prompt = f"""
    Question: {query}

    Answer in a clear and concise manner.
    """
    client = get_client()
    resp = client.models.generate_content(
        model=model,
        contents=prompt,
    )
    return getattr(resp, "text", "")
