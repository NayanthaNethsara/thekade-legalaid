# app/services/rag/qa_service.py
from typing import Dict
from app.domain.ports import ChatHistoryPort, RetrieverPort, LLMPort

PROMPT = """You are a friendly legal assistant. Use ONLY the context to answer.
If not in context, say you don’t know.

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

    def answer(self, chat_id: str, question: str, top_k: int) -> Dict:
        ctx_docs = self.retriever.topk(question, top_k)
        history = "\n".join(self.history.get(chat_id)) or "(no prior turns)"
        prompt = PROMPT.format(ctx="\n\n".join(ctx_docs) or "(no context)", hist=history, q=question)
        answer = self.llm.generate(prompt)
        self.history.append(chat_id, question, answer)
        return {"chat_id": chat_id, "answer": answer, "retrieved_chunks": [c[:500] for c in ctx_docs]}
