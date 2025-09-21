# app/adapters/chat/inmem_history.py
from typing import List, Dict
from app.domain.ports import ChatHistoryPort
import threading

class InMemChatHistory(ChatHistoryPort):
    _data: Dict[str, List[str]] = {}
    _lock = threading.Lock()
    def get(self, chat_id: str) -> List[str]:
        with self._lock:
            return list(self._data.get(chat_id, []))
    def append(self, chat_id: str, q: str, a: str) -> None:
        with self._lock:
            self._data.setdefault(chat_id, []).append(f"Q: {q}\nA: {a}")
    def reset(self, chat_id: str) -> None:
        with self._lock:
            self._data.pop(chat_id, None)
