# kakilleAI Admin — Human-in-the-Loop RAG Builder

Builds a per-file RAG index from legal documents, with a human review step
between parsing and indexing.

```
PDF (data/)  ──parse──▶  Markdown (data/markdown/, human-editable)
             ──approve─▶ chunks ──▶ Gemini embeddings ──▶ Postgres / pgvector
```

**Per-file indexing:** approving one document rebuilds only that document's
chunks. Adding or re-approving a document never affects the others.

## Lifecycle

| status    | meaning                                                        |
|-----------|----------------------------------------------------------------|
| `pending` | PDF registered, not yet parsed                                 |
| `parsed`  | Markdown generated/edited, awaiting human approval             |
| `indexed` | approved + embedded into the vector store                      |
| `error`   | parsing or indexing failed (see `error` field)                 |

An `indexed` document whose Markdown is edited afterward is reported as
`is_stale=true` until it is re-approved.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Postgres with pgvector (from repo root)
docker compose up -d postgres
alembic upgrade head

uvicorn app.main:app --reload --port 8001
```

Configure `.env` (see `.env.example`). A **valid** `GEMINI_API_KEY` is required
for the approve/index and search steps (embeddings use `text-embedding-004`).

## API

| Method & path                      | Purpose                                                        |
|------------------------------------|----------------------------------------------------------------|
| `POST /documents/scan`             | **Parsing hook** — register new PDFs in `data/` and parse the unparsed ones. Existing Markdown/edits are preserved. |
| `POST /documents/upload`           | Upload a new PDF into `data/` (status `pending`).             |
| `GET  /documents`                  | List all documents with status / `is_stale` / chunk counts.  |
| `GET  /documents/{id}`             | One document's metadata.                                       |
| `POST /documents/{id}/parse?force=`| Parse a single document. `force=true` re-parses an already-parsed file (discards Markdown edits). |
| `GET  /documents/{id}/markdown`    | Fetch the editable Markdown.                                   |
| `PUT  /documents/{id}/markdown`    | Save human-edited Markdown. Indexed docs become stale.        |
| `POST /documents/{id}/approve`     | Approve current Markdown → (re)build this document's vector index. |
| `GET  /documents/{id}/chunks`      | Inspect the stored chunks for a document.                     |
| `POST /search`                     | Cosine-similarity search (`query`, `top_k`, optional `document_id`). |
| `GET  /health`                     | Health check.                                                  |

## Typical flow

1. Drop PDFs into `data/` (or `POST /documents/upload`).
2. `POST /documents/scan` → new files become `parsed` Markdown in `data/markdown/`.
3. A human edits the Markdown — in their editor on disk, or via
   `GET`/`PUT /documents/{id}/markdown`.
4. `POST /documents/{id}/approve` → the document is chunked, embedded, and stored.
5. To revise: edit the Markdown and approve again — the old chunks for that file
   are cleared and rebuilt; other documents are untouched.
