# app/services/rag/qa_service.py
from typing import Dict
from app.domain.ports import ChatHistoryPort, RetrieverPort, LLMPort

PROMPT = """You are a friendly legal assistant. Use ONLY the context to answer.
If not in context, say you don't know.

Context:
{ctx}

Conversation so far:
{hist}

User question:
{q}

Answer clearly and concisely:
"""

class QAService:
    def __init__(self, retriever: RetrieverPort, llm: LLMPort, history: ChatHistoryPort):
        self.retriever = retriever
        self.llm = llm
        self.history = history

    def answer(self, chat_id: str, question: str, k: int | None = None) -> dict:
        ctx_docs = self.retriever.topk(question, k)  # retriever will use its default if k is None
        hist_text = "\n".join(self.history.get(chat_id)) or "(no prior turns)"
        ctx_text = '\n\n'.join(ctx_docs) or '(no context)'
        prompt = (
            "You are a friendly legal assistant. Use ONLY the context to answer. "
            "If not in the context, say you don't know.\n\n"
            f"Context:\n{ctx_text}\n\n"
            f"Conversation so far:\n{hist_text}\n\n"
            f"User question:\n{question}\n\n"
            "Answer clearly and concisely:"
        )
        answer = self.llm.generate(prompt)
        self.history.append(chat_id, question, answer)
        return {"chat_id": chat_id, "answer": answer, "retrieved_chunks": [c[:500] for c in ctx_docs]}
