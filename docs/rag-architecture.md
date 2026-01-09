# Retrieval-Augmented Generation (RAG) — Technical Architecture

Status: ✅ **Phases 1-4 Complete** | Last Updated: January 8, 2026

This document describes the RAG system that extends the existing `conv-service` in this repository and uses PostgreSQL + `pgvector` as the vector store.

**🎉 Current Status**: The RAG system is fully operational with 217 chunks indexed from Sri Lankan legal documents. Frontend integration complete with React hooks and UI components. Google Gemini API migration complete.

**📖 See [RAG-INTEGRATION-STATUS.md](RAG-INTEGRATION-STATUS.md) for detailed implementation status and next steps.**

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

---

## Phased Implementation (pre-fed corpus only)

This project will use a pre-fed, trusted legal corpus only. The following phased plan assumes no automatic inclusion of user uploads into the authoritative RAG dataset; only documents explicitly vetted and marked `trusted` by an admin will be indexed and used for answers.

Phase 0 — Planning & corpus curation
- Identify and gather the authoritative Sri Lanka legal materials (road laws, criminal law statutes, official PDFs).
- Decide scope (statutes vs. case law vs. guidance documents) and create a trusted corpus folder.
- Define success criteria (accuracy thresholds, expected citation recall) and privacy constraints.

Phase 1 — Infra & schema
- Provision Postgres with `pgvector` enabled and create the `documents`/`document_chunks` schema via Alembic migration.
- Provision Redis for chat/session cache and ensure Kafka topics exist: `indexing.trusted_files`, `rag.queries`, `whatsapp.outgoing.messages`.
- Add required env vars to `conv-service` config: `DATABASE_URL`, `VECTOR_DIM`, `OPENAI_API_KEY`, `RAG_TOP_K`.

Phase 2 — Admin pre-feed tooling & bulk index
- Implement an admin CLI (`tools/bulk_index.py`) and/or small admin UI that allows devs to register/upload trusted PDFs to Azure Blob and mark them `trusted`.
- The CLI should support local folders containing Sri Lanka law PDFs, run OCR/extraction, and either upload to blob and emit messages to `indexing.trusted_files` or call an indexer API directly.

Phase 3 — Indexer & vector storage
- Implement `conv-service/app/indexer.py` that consumes `indexing.trusted_files`, extracts text, chunks the text, calls the embedding API in batches, and upserts chunks via `app/storage/pgvector.py`.
- Implement `app/storage/pgvector.py` with `upsert_document`, `upsert_chunks`, `query_similar_chunks`.
- Add unit tests for chunking/embedding/upsert.

Phase 4 — RAG query handler
- Implement `/api/rag/query` (HTTP) or a `rag.queries` Kafka consumer that embeds incoming questions, queries `document_chunks` for top-K similar chunks, assembles a prompt with explicit citation metadata, calls the LLM, and returns/publishes the answer.
- Ensure responses include structured citations (source, document id, chunk index, and a short excerpt).

Phase 5 — Relevance tuning & evaluation
- Create an evaluation set of Q/A pairs from the Sri Lanka corpus and measure retrieval+generation accuracy.
- Add a simple reranker (lexical or cross-encoder) to improve final ordering.

Phase 6 — Security, privacy, and operations
- Add role-based access to the admin pre-feed tooling so only authorized devs can mark `trusted` documents.
- Implement PII detection and redaction on the ingestion path if needed.
- Add monitoring (query latency, index size), backups, and reindexing runbooks.

Phase 7 — Docs & demo
- Add `docs/README-rag-quickstart.md` showing how to bulk-index the Sri Lanka corpus and run sample queries.
- Provide a demo script that indexes a small set of statutes and runs example questions.

## How the pre-fed-only RAG system will work (simple)
- Devs curate and mark a set of trusted Sri Lanka legal documents (road law, criminal statutes) using the admin CLI/UI; these documents are uploaded to Azure Blob and registered to the `indexing.trusted_files` topic.
- The indexer consumes `indexing.trusted_files`, extracts text, chunks and embeds each chunk, and stores embeddings + metadata in Postgres (`document_chunks`).
- When a user asks a question, the RAG handler embeds the query, retrieves the top-K relevant chunks from `document_chunks`, composes a prompt that includes those chunks with citations, calls the LLM, and returns the answer plus citations.

### Key design choices for reliability and legal correctness
- Use explicit citations for each supporting chunk so answers can be traced back to statutes or documents.
- Keep the authoritative legal corpus separate and `trusted` by design — no automatic inclusion of user uploads.
- Add a lightweight reranker and conservative prompt templates to reduce hallucinations.

---

If you'd like, I can now scaffold the admin bulk-index CLI and `conv-service/app/indexer.py` + `app/storage/pgvector.py` as a next step.
