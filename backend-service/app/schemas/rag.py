from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class IngestionConfig(BaseModel):
    chunk_size: int = Field(default=500, ge=100, le=2000)
    chunk_overlap: int = Field(default=50, ge=0, le=500)


class DocumentCreate(BaseModel):
    title: str
    category: str
    content: str
    file_name: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    category: str
    file_path: str | None = None
    status: str
    chunk_count: int
    created_at: datetime | str


class TestRetrievalRequest(BaseModel):
    query: str
    top_k: int = Field(default=3, ge=1, le=10)
    category_filter: str | None = None
    similarity_threshold: float = Field(default=0.65, ge=0.0, le=1.0)


class RetrievalChunk(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    category: str
    content: str
    similarity_score: float


class TestRetrievalResponse(BaseModel):
    query: str
    results: list[RetrievalChunk]


class RAGSystemStatus(BaseModel):
    vector_store: str
    embedding_provider: str
    embedding_model: str
    total_documents: int
    total_chunks: int
    health: str
