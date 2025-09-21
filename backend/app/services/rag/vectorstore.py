# app/services/rag/vectorstore.py
from pathlib import Path
from typing import Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.core.config import settings

class VectorStoreHolder:
    store: Optional[FAISS] = None

vs_holder = VectorStoreHolder()

def _embedder():
    return HuggingFaceEmbeddings(model_name=settings.EMBED_MODEL)

def build_or_load_index():
    index_path = Path(settings.INDEX_DIR)
    index_path.mkdir(parents=True, exist_ok=True)  # 👈 ensure dir exists

    faiss_idx = index_path / "index.faiss"
    faiss_pkl = index_path / "index.pkl"

    if faiss_idx.exists() and faiss_pkl.exists():
        vs_holder.store = FAISS.load_local(str(index_path), _embedder(), allow_dangerous_deserialization=True)
        return vs_holder.store

    # Build
    loader = PyPDFLoader(settings.PDF_PATH)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )
    chunks = splitter.split_documents(docs)

    vs = FAISS.from_documents(chunks, _embedder())

    # Persist
    vs.save_local(str(index_path))
    vs_holder.store = vs
    return vs_holder.store

def similarity_search(query: str, k: int):
    if vs_holder.store is None:
        # 👇 last-resort lazy init (in case startup wasn’t called)
        build_or_load_index()
    return vs_holder.store.similarity_search(query, k=k)
