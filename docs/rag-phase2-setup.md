# Phase 2 — Admin Pre-feed Tooling & Bulk Index

**Status:** ✅ Implemented  
**Date:** January 5, 2026

This guide covers Phase 2 of the RAG implementation: admin tooling for bulk-indexing trusted legal documents into the vector database. This phase enables curating and indexing an authoritative Sri Lanka legal corpus (road laws, criminal statutes, official PDFs) that will be used for RAG-powered answers.

---

## Overview

Phase 2 provides a command-line tool (`bulk_index.py`) that allows administrators to:
1. Upload trusted legal documents to Azure Blob Storage (optional)
2. Extract text from PDFs, DOCX, DOC, and TXT files
3. Chunk documents into manageable segments (~1000 tokens with overlap)
4. Generate embeddings for each chunk using OpenAI's embedding API
5. Store document chunks and embeddings in PostgreSQL with pgvector
6. Emit indexing events to Kafka for tracking (optional)

**Key Design Principle:** Only explicitly trusted and admin-vetted documents are indexed — no automatic user uploads are included in the authoritative corpus.

---

## Prerequisites

Before running the bulk indexer, ensure the following are in place:

### 1. Database Setup (Phase 1)
- PostgreSQL with `pgvector` extension enabled
- Database schema created via Alembic migration:
  ```powershell
  cd conv-service
  alembic upgrade head
  ```

### 2. Environment Configuration
Create or update `conv-service/.env` with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/legalaid
DIRECT_URL=postgresql://user:password@localhost:5432/legalaid

# OpenAI for embeddings
OPENAI_API_KEY=sk-...

# Embedding configuration
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
VECTOR_DIM=1536
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Optional: Azure Blob Storage (for document backups)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# Optional: Kafka (for indexing events)
KAFKA_BROKER_URL=localhost:9092
KAFKA_TOPIC_INDEXING_TRUSTED=indexing.trusted_files
KAFKA_USERNAME=
KAFKA_PASSWORD=
KAFKA_SSL=false
```

### 3. Python Dependencies
Install required packages:
```powershell
cd conv-service
pip install -r requirements.txt
```

Key dependencies include:
- `openai` — for embedding generation
- `tiktoken` — for token counting
- `pypdf` — for PDF text extraction
- `python-docx` — for DOCX text extraction
- `pgvector`, `psycopg` — for vector storage
- `azure-storage-blob` — for blob uploads (optional)
- `kafka-python` — for event emission (optional)

---

## Preparing Your Legal Corpus

### 1. Organize Documents
Create a directory containing your trusted legal documents. For example:
```
f:\legal-corpus\
  ├── sri-lanka-road-traffic-act.pdf
  ├── motor-traffic-regulations.pdf
  ├── criminal-procedure-code.pdf
  ├── penal-code-amendments-2024.pdf
  └── ...
```

Supported formats:
- `.pdf` — PDFs with extractable text (OCR not yet implemented)
- `.docx`, `.doc` — Microsoft Word documents
- `.txt` — Plain text files

### 2. Document Quality Check
- Ensure PDFs have extractable text (not scanned images without OCR)
- Remove duplicate or outdated documents
- Consider splitting very large documents by chapter/section for better chunking

---

## Running the Bulk Indexer

### Basic Usage (No Azure Blob or Kafka)
Index documents directly into the database:

```powershell
cd conv-service
python bulk_index.py f:\legal-corpus
```

This will:
- Scan `f:\legal-corpus` recursively for supported documents
- Extract text from each document
- Chunk text into ~1000 token segments with 200 token overlap
- Generate embeddings via OpenAI API
- Store in PostgreSQL with `source="admin-bulk"` and `trusted=True`

### With Azure Blob Upload
Upload documents to Azure Blob Storage before indexing:

```powershell
python bulk_index.py f:\legal-corpus --upload-to-blob
```

This stores a backup of each document in the `trusted-documents` container.

### With Kafka Event Emission
Emit indexing events to Kafka for tracking/monitoring:

```powershell
python bulk_index.py f:\legal-corpus --emit-kafka-events
```

Events are sent to the `indexing.trusted_files` topic.

### Complete Example (All Features)
```powershell
python bulk_index.py f:\legal-corpus `
  --source "sri-lanka-legal-corpus" `
  --chunk-size 1000 `
  --chunk-overlap 200 `
  --upload-to-blob `
  --emit-kafka-events
```

---

## Command-Line Options

```
usage: bulk_index.py [-h] [--source SOURCE] [--chunk-size CHUNK_SIZE]
                     [--chunk-overlap CHUNK_OVERLAP] [--upload-to-blob]
                     [--emit-kafka-events]
                     directory

Bulk index documents into RAG vector database

positional arguments:
  directory             Directory containing documents to index

options:
  -h, --help            show this help message and exit
  --source SOURCE       Source identifier for documents (default: admin-bulk)
  --chunk-size CHUNK_SIZE
                        Chunk size in tokens (default: 1000)
  --chunk-overlap CHUNK_OVERLAP
                        Chunk overlap in tokens (default: 200)
  --upload-to-blob      Upload documents to Azure Blob Storage before indexing
  --emit-kafka-events   Emit indexing events to Kafka topic
```

---

## Expected Output

### During Indexing
```
============================================================
Starting bulk indexing:
  Directory: f:\legal-corpus
  Documents: 15
  Source: admin-bulk
  Chunk size: 1000 tokens
  Chunk overlap: 200 tokens
  Upload to blob: True
  Emit Kafka events: True
============================================================

Indexing documents: 100%|██████████| 15/15 [00:45<00:00,  3.02s/it]

Processing: sri-lanka-road-traffic-act.pdf
Extracting text from sri-lanka-road-traffic-act.pdf (87 pages)
Extracted 125432 characters from sri-lanka-road-traffic-act.pdf
Chunking text: 32456 tokens
Created 34 chunks from 32456 tokens
Generating embeddings for 34 chunks...
Successfully embedded 34 texts (dim=1536)
Uploaded to blob: https://...blob.core.windows.net/trusted-documents/20260105-143022-sri-lanka-road-traffic-act.pdf
Inserted 34 chunks for document 1
✅ Indexed sri-lanka-road-traffic-act.pdf: document_id=1, chunks=34
Emitted indexing event to indexing.trusted_files: document_id=1, partition=0, offset=12

...

============================================================
Indexing complete!
  ✅ Success: 15
  ❌ Errors: 0
  ⏭️  Skipped: 0
  📦 Total chunks: 512

Database stats:
  Documents: 15
  Chunks: 512
============================================================
```

---

## Verifying the Index

### Check Document Count
```powershell
# Connect to PostgreSQL
psql -U user -d legalaid -c "SELECT COUNT(*) FROM documents WHERE metadata->>'trusted' = 'true';"
```

Expected output:
```
 count 
-------
    15
```

### Check Chunk Count
```sql
SELECT COUNT(*) FROM document_chunks;
```

### Inspect a Document
```sql
SELECT id, source, metadata->>'filename' as filename, 
       length(content) as content_length, created_at
FROM documents
WHERE source = 'admin-bulk'
ORDER BY created_at DESC
LIMIT 5;
```

### Test Vector Search
```sql
-- Get a sample embedding from an existing chunk
SELECT embedding <=> (SELECT embedding FROM document_chunks LIMIT 1) AS distance
FROM document_chunks
ORDER BY distance
LIMIT 5;
```

---

## Troubleshooting

### Issue: "No text extracted" warnings
**Cause:** PDF contains scanned images without OCR layer  
**Solution:** Use an OCR tool (Adobe Acrobat, Tesseract) to add a text layer before indexing

### Issue: "Failed to generate embeddings"
**Cause:** OpenAI API key invalid or rate limit exceeded  
**Solution:** 
- Verify `OPENAI_API_KEY` in `.env`
- Check your OpenAI usage limits and billing status
- Add retry/backoff logic (already implemented in `EmbeddingClient`)

### Issue: "Azure Blob upload failed"
**Cause:** Invalid `AZURE_STORAGE_CONNECTION_STRING` or network issue  
**Solution:**
- Verify connection string in `.env`
- Check network connectivity to Azure
- Run without `--upload-to-blob` flag to skip blob uploads

### Issue: "Kafka event emission failed"
**Cause:** Kafka broker unreachable or authentication issue  
**Solution:**
- Verify `KAFKA_BROKER_URL` and credentials in `.env`
- Run without `--emit-kafka-events` flag to skip Kafka
- Check Kafka broker logs

### Issue: Large documents take too long to process
**Solution:**
- Process documents in smaller batches
- Increase `batch_size` in `EmbeddingClient` (default: 100)
- Use async processing (future enhancement)

---

## Cost Estimates

### OpenAI API Costs (text-embedding-3-small)
- **Pricing:** ~$0.02 per 1M tokens
- **Example corpus:** 15 PDFs, ~500K tokens total
- **Estimated cost:** $0.01 (negligible)

For larger corpora:
- 1000 PDFs (~30M tokens): ~$0.60
- 10,000 PDFs (~300M tokens): ~$6.00

### Azure Blob Storage Costs
- **Storage:** ~$0.018 per GB/month
- **Transactions:** Negligible for bulk uploads
- **Example:** 15 PDFs (50 MB total) = $0.001/month

---

## Next Steps

After completing Phase 2:

1. **Verify Index Quality**
   - Run sample queries against the vector database
   - Check that relevant documents are retrieved

2. **Proceed to Phase 3** (Indexer & Vector Storage)
   - Implement automated indexer worker to consume Kafka events
   - Add reindexing capabilities for updated documents

3. **Phase 4** (RAG Query Handler)
   - Build `/api/rag/query` endpoint
   - Implement prompt engineering with citations
   - Add LLM integration for answer generation

---

## Maintenance

### Reindexing Documents
To reindex documents (e.g., after corpus updates):

1. Delete old entries:
   ```sql
   DELETE FROM documents WHERE source = 'admin-bulk';
   -- Chunks are deleted automatically via CASCADE
   ```

2. Run bulk indexer again:
   ```powershell
   python bulk_index.py f:\legal-corpus --upload-to-blob --emit-kafka-events
   ```

### Adding New Documents
Simply add new files to your corpus directory and run the indexer again. Existing documents are not reprocessed (based on filename).

### Monitoring Index Size
```sql
-- Get index size breakdown
SELECT 
  pg_size_pretty(pg_total_relation_size('documents')) as documents_size,
  pg_size_pretty(pg_total_relation_size('document_chunks')) as chunks_size,
  pg_size_pretty(pg_indexes_size('document_chunks')) as index_size;
```

---

## Security Considerations

### Access Control
- Restrict access to the bulk indexer CLI to admin users only
- Use role-based access control (RBAC) in production
- Consider adding an admin UI with authentication

### PII & Sensitive Data
- Review documents before indexing to ensure no PII leakage
- Add PII detection/redaction if handling user-uploaded content
- Mark all admin-bulk uploads with `trusted=True` metadata

### API Key Security
- Store `OPENAI_API_KEY` and `AZURE_STORAGE_CONNECTION_STRING` in secure vaults (Azure Key Vault, HashiCorp Vault)
- Never commit `.env` files to version control
- Rotate keys regularly

---

## Additional Resources

- **RAG Architecture:** [docs/rag-architecture.md](./rag-architecture.md)
- **OpenAI Embeddings Guide:** https://platform.openai.com/docs/guides/embeddings
- **pgvector Documentation:** https://github.com/pgvector/pgvector
- **Phase 1 Setup:** [docs/rag-phase1-setup.md](./rag-phase1-setup.md) *(to be created)*

---

**Phase 2 Complete!** ✅  
You now have a working admin tool to bulk-index trusted legal documents into your RAG vector database.
