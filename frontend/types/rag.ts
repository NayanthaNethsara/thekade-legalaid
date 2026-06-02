// Domain types for the kakilleAI RAG builder. These mirror the backend-service
// (FastAPI) response shapes and are shared across the API client, server
// actions, and UI.

export type DocStatus = "pending" | "parsed" | "indexed" | "error";

export type RagDocument = {
  id: number;
  source_filename: string;
  status: DocStatus;
  chunk_count: number;
  is_stale: boolean;
  error: string | null;
  markdown_path: string | null;
  parsed_at: string | null;
  indexed_at: string | null;
  updated_at: string | null;
};

export type MarkdownDoc = {
  document_id: number;
  source_filename: string;
  content: string;
};

export type RagChunk = {
  chunk_index: number;
  heading: string | null;
  content: string;
  token_count: number | null;
};

export type ParseNewResult = {
  parsed: string[];
  errors: { file: string; error: string }[];
};

export type SearchHit = {
  document_id: number;
  chunk_index: number;
  heading: string | null;
  content: string;
  score: number;
};

export type SearchResult = {
  query: string;
  hits: SearchHit[];
};

export type SearchRequest = {
  query: string;
  top_k?: number;
  document_id?: number | null;
};
