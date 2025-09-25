from app.domain.ports import LLMPort
from app.services.llm.gemini_client import get_client
from app.core.config import settings

class GeminiLLM(LLMPort):
    def generate(self, prompt: str, model: str | None = None) -> str:
        client = get_client()
        model_name = model or settings.DEFAULT_MODEL
        
        # Create the generative model instance
        model_instance = client.GenerativeModel(model_name)
        
        # Generate content using the model
        response = model_instance.generate_content(prompt)
        
        return response.text if hasattr(response, 'text') else ""
