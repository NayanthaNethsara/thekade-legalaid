# app/adapters/llm/gemini_llm.py
from app.domain.ports import LLMPort
from app.services.llm.gemini_client import get_client
from app.core.config import settings

class GeminiLLM(LLMPort):
    def generate(self, prompt: str, model: str | None = None) -> str:
        client = get_client()
        resp = client.models.generate_content(
            model=model or settings.DEFAULT_MODEL,
            contents=prompt
        )
        return getattr(resp, "text", "") or ""
