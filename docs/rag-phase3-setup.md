# Phase 3 — Indexer & Vector Storage (Kafka Consumer)

**Status:** ✅ Implemented  
**Date:** January 7, 2026

This guide covers Phase 3 of the RAG implementation: the indexer service that consumes indexing events from Kafka and automatically indexes documents into the vector database. This enables real-time document indexing triggered by events from the bulk indexer, WhatsApp gateway, or other sources.

---

## Overview

Phase 3 provides a Kafka consumer worker (`indexer_worker.py`) that:
1. Consumes messages from the `indexing.trusted_files` Kafka topic
2. Downloads documents from Azure Blob Storage
3. Extracts text from PDFs, DOCX, DOC, and TXT files
4. Chunks documents into manageable segments
5. Generates embeddings for each chunk using the Gemini API
6. Stores document chunks and embeddings in PostgreSQL with pgvector

**Key Benefits:**
- Asynchronous, event-driven document indexing
- Decoupled from the upload/ingestion flow
- Scalable (can run multiple workers)
- Fault-tolerant (Kafka ensures delivery)

---

## Architecture

```
[Bulk Indexer] ──┐
                  │
[WhatsApp Gateway]├──> [Kafka Topic] ──> [Indexer Worker] ──> [PostgreSQL + pgvector]
                  │    indexing.trusted_files
[Frontend Upload]─┘
```

---

## Prerequisites

### 1. Completed Phase 1 & 2
- PostgreSQL with pgvector extension
- Database schema created
- Environment variables configured
- Kafka cluster running

### 2. Kafka Topics
Ensure the following Kafka topics exist:

```powershell
# Using Kafka CLI tools
kafka-topics.sh --create --topic indexing.trusted_files --bootstrap-server localhost:9092
kafka-topics.sh --create --topic rag.queries --bootstrap-server localhost:9092
```

For managed Kafka (Confluent, Azure Event Hubs), create topics via the admin console.

### 3. Environment Variables
Update `conv-service/.env` with:

```env
# Kafka configuration
KAFKA_BROKER_URL=localhost:9092
KAFKA_TOPIC_INDEXING_TRUSTED=indexing.trusted_files
KAFKA_TOPIC_RAG_QUERIES=rag.queries
KAFKA_TOPIC_OUTGOING=whatsapp.outgoing.messages
KAFKA_USERNAME=
KAFKA_PASSWORD=
KAFKA_SSL=false

# Azure Blob Storage (required for downloading documents)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# Database (from Phase 1)
DATABASE_URL=postgresql://user:password@localhost:5432/legalaid
DIRECT_URL=postgresql://user:password@localhost:5432/legalaid

# Embeddings (from Phase 2)
GEMINI_API_KEY=AIzaSyC...
GEMINI_EMBEDDING_MODEL=models/embedding-001
VECTOR_DIM=768
```

---

## Running the Indexer Worker

### Option 1: Using PowerShell Script (Recommended)

```powershell
cd conv-service
.\start-indexer.ps1
```

This script will:
- Activate the virtual environment
- Start the indexer worker
- Display logs in the console

### Option 2: Manual Start

```powershell
cd conv-service
.\.venv\Scripts\Activate.ps1
python indexer_worker.py
```

---

## Running the RAG Query Consumer

The RAG query consumer processes questions from Kafka and responds with answers:

```powershell
cd conv-service
.\start-rag-query-consumer.ps1
```

This enables async RAG processing for WhatsApp and other sources.

---

## Running the RAG API Server

For synchronous HTTP queries (used by the frontend):

```powershell
cd conv-service
.\start-rag-api.ps1
```

This starts a FastAPI server on `http://localhost:8000` with:
- `/api/rag/query` — Query endpoint
- `/api/rag/stats` — System statistics
- `/docs` — Interactive API documentation

---

## Testing the Indexer

### 1. Trigger Indexing via Bulk Indexer

The bulk indexer can emit events to Kafka:

```powershell
cd conv-service
python bulk_index.py f:\legal-corpus --emit-kafka-events
```

This will:
- Upload documents to Azure Blob Storage
- Emit indexing events to `indexing.trusted_files` topic
- The indexer worker will consume and process these events

### 2. Manual Event Testing

You can manually publish test events to Kafka:

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

test_event = {
    "blob_url": "https://your-storage.blob.core.windows.net/trusted-documents/test.pdf",
    "source": "admin-bulk",
    "source_id": "test-001",
    "metadata": {
        "filename": "test.pdf",
        "mime_type": "application/pdf",
        "uploaded_by": "admin"
    }
}

producer.send('indexing.trusted_files', test_event)
producer.flush()
```

### 3. Check Indexer Logs

Monitor the indexer worker logs for processing status:

```
[1] Received indexing event: test.pdf
Extracting text from PDF bytes (5 pages)
Document 123 chunked into 12 chunks
✅ Successfully indexed document 123: test.pdf (12 chunks)
```

---

## Monitoring & Operations

### Check Indexing Status

Query the database to see indexed documents:

```sql
-- Count documents and chunks
SELECT 
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(c.id) as total_chunks,
    SUM(pg_column_size(c.embedding)) / 1024 / 1024 as vector_storage_mb
FROM documents d
LEFT JOIN document_chunks c ON c.document_id = d.id;

-- Recent documents
SELECT 
    id,
    source,
    metadata->>'filename' as filename,
    created_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;
```

### Worker Health Check

The indexer worker logs stats every 10 messages:

```
📊 Stats: Processed=10, Success=9, Errors=1
```

### Restart Worker

To restart the indexer worker:

```powershell
# Press Ctrl+C to stop
# Then restart
.\start-indexer.ps1
```

---

## Scaling

### Run Multiple Workers

For higher throughput, run multiple indexer workers in parallel:

```powershell
# Terminal 1
.\start-indexer.ps1

# Terminal 2
.\start-indexer.ps1

# Terminal 3
.\start-indexer.ps1
```

Kafka will distribute messages across workers automatically.

### Batch Processing

To process a large corpus quickly:
1. Run 3-5 indexer workers in parallel
2. Run the bulk indexer with `--emit-kafka-events`
3. Monitor progress via database queries

---

## Troubleshooting

### Worker Not Receiving Messages

**Check Kafka connection:**
```powershell
# Verify Kafka is running
telnet localhost 9092

# List topics
kafka-topics.sh --list --bootstrap-server localhost:9092
```

**Check consumer group:**
```powershell
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group indexer-worker
```

### Download Failures

**Check Azure Storage connection:**
```powershell
# Test connection string
$env:AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;..."
python -c "from app.utils.azure_storage import download_blob_to_bytes; print(download_blob_to_bytes('https://...'))"
```

### Embedding Failures

**Check Gemini API key:**
```powershell
python -c "from app.services.embeddings import EmbeddingClient; client = EmbeddingClient(); print(client.embed_text('test'))"
```

### Database Connection Issues

**Verify pgvector extension:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Check connection:**
```powershell
python -c "from app.core.config import settings; from app.storage.pgvector import PgVectorStore; store = PgVectorStore(); print('Connected')"
```

---

## Next Steps

With Phase 3 complete, you can now:

1. **Phase 4:** Integrate RAG queries into the WhatsApp gateway
   - Update message routing to detect questions
   - Emit queries to `rag.queries` topic
   - Consume responses from `whatsapp.outgoing.messages`

2. **Phase 5:** Frontend integration
   - Add RAG query UI component
   - Call `/api/rag/query` endpoint
   - Display answers with citations

3. **Phase 6:** Relevance tuning
   - Create evaluation dataset
   - Tune chunk size and overlap
   - Add reranking

---

## Files Created

- `app/services/indexer_service.py` — Core indexer service
- `indexer_worker.py` — Kafka consumer worker
- `rag_query_consumer.py` — RAG query processor
- `start-indexer.ps1` — Start indexer worker script
- `start-rag-query-consumer.ps1` — Start query consumer script
- `start-rag-api.ps1` — Start API server script
- `app/utils/azure_storage.py` — Updated with download functions
- `app/utils/text_extraction.py` — Updated with bytes extraction

---

## Summary

Phase 3 provides a production-ready, event-driven indexing pipeline that:
- ✅ Consumes Kafka events for real-time indexing
- ✅ Downloads and processes documents from Azure Blob
- ✅ Generates embeddings using Gemini API
- ✅ Stores vectors in PostgreSQL with pgvector
- ✅ Supports multiple concurrent workers
- ✅ Handles errors gracefully
- ✅ Provides monitoring and stats

The system is now ready to automatically index trusted legal documents and serve RAG-powered queries!
