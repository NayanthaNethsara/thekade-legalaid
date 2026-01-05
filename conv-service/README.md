# Conversation Service (Python Worker)

This service handles conversation logic and interacts with the database.

## Prerequisites

- Python 3.9+
- PostgreSQL
- pip

## Setup

1. **Create Virtual Environment:**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Setup:**
   Copy `.env.example` to `.env` and update the `DATABASE_URL`.
   ```bash
   cp .env.example .env
   ```

## Database Migrations

This project uses Alembic for database migrations.

1. **Generate Migration:**

   ```bash
   alembic revision --autogenerate -m "Message"
   ```

2. **Apply Migrations:**
   ```bash
   alembic upgrade head
   ```

## Project Structure

- `app/`: Application code
  - `core/`: Configuration and database setup
  - `models/`: Database models
  - `services/`: Business logic (embeddings, Kafka, message processing)
  - `storage/`: Vector storage layer (pgvector)
  - `utils/`: Utilities (text extraction, chunking, Azure Blob, Kafka emitter)
- `alembic/`: Migration scripts
- `bulk_index.py`: CLI tool for bulk indexing trusted documents (Phase 2)
- `examples_bulk_index.py`: Usage examples for bulk indexing

## RAG System (Retrieval-Augmented Generation)

This service includes a RAG implementation for contextual legal Q&A using trusted documents.

### Phase 2: Admin Pre-feed Tooling (✅ Completed)

The bulk indexing tool allows admins to index trusted legal documents into the vector database.

**Quick Start:**
```powershell
# 1. Run database migrations
alembic upgrade head

# 2. Configure environment variables in .env
#    - DATABASE_URL
#    - OPENAI_API_KEY
#    - AZURE_STORAGE_CONNECTION_STRING (optional)
#    - KAFKA_BROKER_URL (optional)

# 3. Index your legal corpus
python bulk_index.py f:\legal-corpus --upload-to-blob --emit-kafka-events
```

**Features:**
- Extracts text from PDF, DOCX, DOC, and TXT files
- Chunks documents with configurable token size and overlap
- Generates embeddings via OpenAI API
- Stores vectors in PostgreSQL with pgvector
- Optional Azure Blob backup of source documents
- Optional Kafka event emission for tracking

**Documentation:**
- [RAG Architecture Overview](../docs/rag-architecture.md)
- [Phase 2 Setup Guide](../docs/rag-phase2-setup.md)

### Usage Examples

See [examples_bulk_index.py](./examples_bulk_index.py) for common usage patterns:

```powershell
# Basic indexing
python bulk_index.py f:\legal-corpus

# With Azure Blob backup
python bulk_index.py f:\legal-corpus --upload-to-blob

# Full production setup
python bulk_index.py f:\legal-corpus \
  --source "sri-lanka-legal-corpus" \
  --chunk-size 1000 \
  --chunk-overlap 200 \
  --upload-to-blob \
  --emit-kafka-events
```

