# app/adapters/rag/faiss_retriever.py
from typing import List
from app.domain.ports import RetrieverPort
from app.services.rag.vectorstore import similarity_search

class FaissRetriever(RetrieverPort):
    def __init__(self, k: int): self.k = k
    def topk(self, query: str, k: int | None = None) -> List[str]:
        docs = similarity_search(query, k or self.k)
        return [d.page_content for d in docs]
