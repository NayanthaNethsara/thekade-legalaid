from app.core.llm_client import LLMClient

llm = LLMClient()

class ChatbotService:
    @staticmethod
    async def ask(user_id: str, text: str) -> str:
        # send user message to your RAG / chatbot system
        prompt = f"User ({user_id}): {text}\nAnswer:"
        return llm.generate(prompt)
