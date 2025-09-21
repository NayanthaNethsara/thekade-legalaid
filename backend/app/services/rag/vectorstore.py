from pathlib import Path
from typing import Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.core.config import settings

class VectorStoreHolder:
    """Singleton-ish holder to share a FAISS store across requests."""
    store: Optional[FAISS] = None

vs_holder = VectorStoreHolder()

def _embedder():
    return HuggingFaceEmbeddings(model_name=settings.EMBED_MODEL)

def build_or_load_index():
    """
    Load FAISS from disk if present; otherwise build from PDF, then persist.
    """
    index_path = settings.INDEX_DIR
    faiss_idx = Path(index_path, "index.faiss")
    faiss_pkl = Path(index_path, "index.pkl")

    if faiss_idx.exists() and faiss_pkl.exists():
        vs_holder.store = FAISS.load_local(index_path, _embedder(), allow_dangerous_deserialization=True)
        return vs_holder.store

    # Build
    loader = PyPDFLoader(settings.PDF_PATH)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )
    chunks = splitter.split_documents(docs)

    embeddings = _embedder()
    vs = FAISS.from_documents(chunks, embeddings)

    # Persist
    vs.save_local(index_path)
    vs_holder.store = vs
    return vs_holder.store

def similarity_search(query: str, k: int):
    if vs_holder.store is None:
        raise RuntimeError("Vectorstore not ready")
    return vs_holder.store.similarity_search(query, k=k)
