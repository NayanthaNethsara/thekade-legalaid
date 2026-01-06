from abc import ABC, abstractmethod
from typing import List

class LLMService(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str) -> str:
        pass

    @abstractmethod
    async def classify_intent(self, text: str, intents: List[str]) -> str:
        pass
