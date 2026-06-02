from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: int
    source_filename: str
    status: str
    chunk_count: int
    is_stale: bool
    error: Optional[str] = None
    markdown_path: Optional[str] = None
    parsed_at: Optional[datetime] = None
    indexed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MarkdownOut(BaseModel):
    document_id: int
    source_filename: str
    content: str


class MarkdownIn(BaseModel):
    content: str


class ChunkOut(BaseModel):
    chunk_index: int
    heading: Optional[str] = None
    content: str
    token_count: Optional[int] = None

    class Config:
        from_attributes = True


class ParseNewResult(BaseModel):
    parsed: List[str]
    errors: List[dict]


class SearchIn(BaseModel):
    query: str
    top_k: int = 5
    document_id: Optional[int] = None


class SearchHit(BaseModel):
    document_id: int
    chunk_index: int
    heading: Optional[str] = None
    content: str
    score: float


class SearchOut(BaseModel):
    query: str
    hits: List[SearchHit]
