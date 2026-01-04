# Retrieval-Augmented Generation (RAG) — Technical Architecture

Status: Draft

This document describes a concrete RAG design that extends the existing `conv-service` in this repository and uses PostgreSQL + `pgvector` as the vector store. It is targeted for the current codebase (frontend, `whatsapp-gateway`, `conv-service`) and assumes Kafka and hosted infra are available.

---

## Goals
- Add RAG capabilities so user queries (from the frontend or WhatsApp) can return contextually accurate answers with citations drawn from uploaded documents/media.
- Reuse existing flows: Azure Blob (already used by `whatsapp-gateway`) and Kafka topics already present.
- Store vectors in Postgres using `pgvector` for operational simplicity and integration with existing relational data.

## High-level Components

- Ingestion (existing): `whatsapp-gateway` uploads media to Azure Blob and emits Kafka messages with file metadata. The frontend can also upload documents (via a API route) and reuse the same flow.
- Indexer (new within `conv-service`): consumes an indexing Kafka topic, downloads blobs, extracts text, chunks and creates embeddings, and upserts vectors into Postgres (`pgvector`).
- Vector DB (Postgres + pgvector): stores document chunks, embeddings, and provenance metadata.
- RAG Query Handler (extend `conv-service`): handles queries by retrieving top‑k vectors, assembling prompt with chat history, calling the LLM provider, and producing an outgoing message to Kafka for delivery.
- LLM & Embeddings: hosted provider (OpenAI / Azure OpenAI recommended). Embeddings dimension typically 1536 for OpenAI `text-embedding-3-small`/`text-embedding-3-large` etc.
- Cache/Session: Redis for short-term chat history and caching of embeddings or results (optional but recommended).

## Data Flow (detailed)

1. Upload/Receive:
   - User uploads doc via frontend or sends media via WhatsApp.
   - `whatsapp-gateway` stores blob in Azure and emits a Kafka message to `whatsapp.incoming.files` (or a new `indexing.files` topic) containing `blob_url`, `message_id`, `from`, `timestamp`, and metadata.

2. Indexing pipeline (indexer worker in `conv-service`):
   - Indexer consumes the file topic.
   - Downloads blob from Azure Blob Storage.
   - Extract text (PDF/TXT/DOCX/OCR for images), normalize encoding, split into chunks (recommend chunk size ~1000 tokens, overlap 200 tokens).
   - Generate embeddings for each chunk via embedding provider.
   - Upsert chunk records into Postgres (see schema below) with `embedding` stored as a `vector` column.

3. Query (frontend or WhatsApp):
   - User query reaches the hosted API (RAG endpoint) or enqueues a `rag.queries` Kafka message.
   - RAG handler retrieves last N chat messages (from Redis or Postgres), computes query embedding, performs ANN search via Postgres `ORDER BY embedding <=> query_embedding LIMIT k`.
   - Compose prompt with retrieved chunks (include citations: `source_url`, `document_id`, `chunk_id`) and user context.
   - Call LLM for answer generation; include citation tags in the output.
   - Emit outgoing message to Kafka `whatsapp.outgoing.messages` for `whatsapp-gateway` to send back to the user, and return a response to the frontend if requested.

## Postgres + pgvector Schema (recommended)

Run this in your database (example using psql):

```sql
-- enable extension (run as a superuser or in managed DB that supports extensions)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL, -- e.g., "whatsapp", "frontend-upload"
  source_id TEXT, -- original message id or upload id
  blob_url TEXT, -- azure blob url
  content TEXT, -- optional whole extracted text
  metadata JSONB, -- any metadata (mime, author, date)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- index for nearest-neighbor search acceleration (use ivfflat for larger datasets)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
```

Notes:
- Adjust vector dimension (`vector(1536)`) to match the embedding model you select.
- On a small dataset, `ORDER BY embedding <=> query_embedding` with a bloom index may be sufficient; for production use, configure `ivfflat` and run `VACUUM`/`ANALYZE` as advised by `pgvector` docs.

## Example embedding & upsert pseudocode (Python, inside `conv-service`)

```python
from openai import OpenAI
import psycopg

client = OpenAI(api_key=OPENAI_API_KEY)

def embed_text(text):
    r = client.embeddings.create(model="text-embedding-3-small", input=text)
    return r.data[0].embedding

def upsert_chunk(conn, document_id, chunk_index, text, embedding, metadata):
    conn.execute(
        """
        INSERT INTO document_chunks (document_id, chunk_index, text, embedding, metadata)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (document_id, chunk_index, text, embedding, json.dumps(metadata)),
    )
```

Use `psycopg`/`sqlalchemy` which support sending array/binary for the `vector` column. `pgvector` client libs for Python exist if you prefer.

## Retrieval example (SQL)

```sql
-- compute a query embedding in your app, then run:
SELECT id, document_id, chunk_index, text, metadata,
       embedding <=> $1 AS distance
FROM document_chunks
ORDER BY embedding <=> $1
LIMIT 10;
```

(`$1` is a parameter containing the embedding vector in the correct binary/array form.)

## Extending `conv-service` (concrete tasks)

1. Add an Indexer worker inside `conv-service`:
   - New module: `conv-service/app/indexer.py` or extend `app/services/message_processor.py` to route indexing events.
   - Consumes `whatsapp.incoming.files` (or `indexing.files`) and `frontend.uploads` (if present).
   - Uses existing `app/core/config.py` settings for `KAFKA_BROKER_URL` and add new envs for `OPENAI_API_KEY`, `VECTOR_DIM`, `PG_DSN`, `REDIS_URL`.
   - Implements extractors for common file types (PDF/DOCX/HTML/Images via Tesseract).
   - Chunking & embedding logic; batch embedding requests to reduce cost.

2. Add Vector persistence layer:
   - `conv-service/app/storage/pgvector.py` with functions: `upsert_document`, `upsert_chunks`, `query_similar_chunks`.
   - Use `sqlalchemy` with `pgvector` extension or `psycopg` with proper binary passing.

3. Add RAG query handler (in `conv-service`):
   - Add REST endpoint `/api/rag/query` or consume `rag.queries` Kafka topic.
   - On query: compute query embedding, call `query_similar_chunks`, assemble prompt and call LLM.
   - Produce answer with citations and push result to `whatsapp.outgoing.messages` topic (so `whatsapp-gateway` sends it) and return response to frontend.

4. Chat history & context:
   - Store recent message history per user in Redis; include last N messages in prompt.

5. Migrations & Alembic:
   - Add Alembic migration to create `documents` and `document_chunks` tables. Example migration stub can be generated and then edited to include `vector(1536)` column creation.

## Environment variables (minimum)

- `DATABASE_URL` (Postgres DSN with pgvector extension enabled)
- `OPENAI_API_KEY` (or other embedding provider keys)
- `VECTOR_DIM` (e.g., 1536)
- `CHUNK_SIZE` (e.g., 1000 tokens)
- `CHUNK_OVERLAP` (e.g., 200 tokens)
- `RAG_TOP_K` (e.g., 5)
- `KAFKA_BROKER_URL` (existing)
- `AZURE_STORAGE_CONNECTION_STRING` (existing)
- `REDIS_URL` (optional for session/cache)

## Security, privacy and compliance

- PII: detect and optionally redact personally identifiable information prior to indexing. Implement an opt-out field per message/document.
- Access control: protect the RAG API with JWT tokens or API keys (frontend should obtain tokens via auth service).
- Data lifecycle: provide the ability to delete documents and their vectors.

## Testing & QA

- Unit tests: embedding, chunking, upsert, retrieval correctness.
- Integration tests: index sample documents, run a set of queries and assert that returned citations include expected documents.
- E2E smoke: UI → API → produce outgoing Kafka message → gateway → confirmation.

## Operational notes

- Monitor vector index size and query latency; move to dedicated vector DB (Qdrant/Pinecone) if Postgres performance becomes a concern.
- Backups: ensure Postgres backups include vector data.
- Cost: monitor embedding API usage and add caching or rate limits.

---

If you want, I can:
- add an Alembic migration file with the `documents` and `document_chunks` tables,
- scaffold `conv-service/app/indexer.py` and `conv-service/app/storage/pgvector.py`, or
- create a short `docs/README-rag-quickstart.md` with step-by-step run instructions.

Created by: repository assistant
