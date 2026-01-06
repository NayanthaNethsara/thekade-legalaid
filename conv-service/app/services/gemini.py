import google.generativeai as genai
from typing import List
from app.core.llm import LLMService
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class GeminiLLMService(LLMService):
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')

    async def generate_response(self, prompt: str) -> str:
        try:
            response = await self.model.generate_content_async(prompt)
            # Access text attribute instead of relying on iterate
            return response.text
        except Exception as e:
            logger.error(f"Error generating response from Gemini: {e}")
            return "I'm sorry, I'm having trouble processing your request right now."

    async def classify_intent(self, text: str, intents: List[str]) -> str:
        prompt = f"""
        Classify the following text into one of these intents: {', '.join(intents)}.
        
        Text: "{text}"
        
        Return ONLY the intent name.
        """
        try:
            response = await self.model.generate_content_async(prompt)
            intent = response.text.strip().lower()
            if intent not in intents:
                logger.warning(f"Gemini returned invalid intent: {intent}. Defaulting to first intent.")
                return intents[0]
            return intent
        except Exception as e:
            logger.error(f"Error classifying intent with Gemini: {e}")
            return intents[0]
