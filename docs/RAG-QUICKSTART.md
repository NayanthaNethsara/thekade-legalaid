# RAG System Quick Start Guide

This guide helps you quickly set up and run the complete RAG (Retrieval-Augmented Generation) system for the Legal Aid platform.

---

## 📋 Overview

The RAG system enables AI-powered legal question answering using a curated corpus of Sri Lankan legal documents. It consists of:

1. **Vector Database** — PostgreSQL with pgvector for document storage
2. **Bulk Indexer** — CLI tool to index legal documents
3. **Indexer Worker** — Kafka consumer for async indexing
4. **RAG API** — HTTP endpoint for synchronous queries
5. **RAG Query Consumer** — Kafka consumer for async queries (WhatsApp)

---

## 🚀 Quick Start (5 Minutes)

### 1. Prerequisites

- **Python 3.9+** installed
- **PostgreSQL 12+** with superuser access
- **Kafka** cluster running (local or hosted)
- **Gemini API Key** ([Get free key](https://aistudio.google.com/app/apikey))

### 2. Database Setup

```powershell
# Navigate to conv-service
cd conv-service

# Run schema setup
python run_rag_setup.py
```

This creates the `documents` and `document_chunks` tables with pgvector extension.

### 3. Environment Configuration

Create `.env` file in `conv-service/`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/legalaid
DIRECT_URL=postgresql://user:password@localhost:5432/legalaid

# Gemini API (FREE!)
GEMINI_API_KEY=AIzaSyC...

# Embeddings
GEMINI_EMBEDDING_MODEL=models/embedding-001
VECTOR_DIM=768
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RAG_TOP_K=5

# Kafka
KAFKA_BROKER_URL=localhost:9092
KAFKA_TOPIC_INDEXING_TRUSTED=indexing.trusted_files
KAFKA_TOPIC_RAG_QUERIES=rag.queries
KAFKA_TOPIC_OUTGOING=whatsapp.outgoing.messages

# Azure Storage (optional, for blob uploads)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
```

### 4. Install Dependencies

```powershell
# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 5. Index Legal Documents

```powershell
# Index documents from a folder
python bulk_index.py f:\legal-corpus

# Or with all options
python bulk_index.py f:\legal-corpus --upload-to-blob --emit-kafka-events
```

### 6. Start Services

#### Option A: All-in-One (Development)

```powershell
# Terminal 1: Start RAG API
.\start-rag-api.ps1

# Terminal 2: Start Indexer Worker (optional)
.\start-indexer.ps1

# Terminal 3: Start RAG Query Consumer (optional)
.\start-rag-query-consumer.ps1
```

#### Option B: API Only (Testing)

```powershell
# Just start the API for frontend testing
.\start-rag-api.ps1
```

### 7. Test the System

```powershell
# Test via HTTP
python test_rag_api.py

# Or use curl
curl -X POST http://localhost:8000/api/rag/query `
  -H "Content-Type: application/json" `
  -d '{\"question\": \"What is the speed limit in Sri Lanka?\"}'
```

---

## 📚 Detailed Documentation

For more details, see the phase-specific guides:

- **[Phase 1: Infrastructure Setup](rag-phase1-setup.md)** — Database, Kafka, Redis setup
- **[Phase 2: Bulk Indexing](rag-phase2-setup.md)** — Admin tooling, corpus curation
- **[Phase 3: Indexer Service](rag-phase3-setup.md)** — Kafka consumers, async processing
- **[Architecture Overview](rag-architecture.md)** — System design, data flow

---

## 🔧 Available Scripts

### Indexing

| Script | Purpose |
|--------|---------|
| `bulk_index.py` | Bulk index documents from a directory |
| `start-indexer.ps1` | Start Kafka indexer worker |

### Querying

| Script | Purpose |
|--------|---------|
| `start-rag-api.ps1` | Start HTTP API server (port 8000) |
| `start-rag-query-consumer.ps1` | Start Kafka query consumer |
| `test_rag_api.py` | Test the RAG API |

### Utilities

| Script | Purpose |
|--------|---------|
| `run_rag_setup.py` | Set up database schema |
| `check_gemini.py` | Test Gemini API connection |

---

## 🏗️ System Architecture

```
┌─────────────────┐
│  Legal Corpus   │
│  (Trusted PDFs) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Bulk Indexer   │────▶│  Azure Blob      │
│  (CLI Tool)     │     │  Storage         │
└────────┬────────┘     └──────────────────┘
         │
         │ Events
         ▼
┌─────────────────────────────────────────────┐
│             Kafka Topics                     │
│  • indexing.trusted_files                   │
│  • rag.queries                              │
│  • whatsapp.outgoing.messages               │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────┐     ┌──────────────────┐
│ Indexer Worker  │────▶│  PostgreSQL      │
│ (Kafka Consumer)│     │  + pgvector      │
└─────────────────┘     └──────────────────┘
                                 ▲
                                 │
           ┌─────────────────────┴─────────────┐
           │                                   │
    ┌──────┴──────┐                  ┌─────────┴────────┐
    │  RAG API    │                  │  RAG Query       │
    │  (HTTP)     │                  │  Consumer        │
    │             │                  │  (Kafka)         │
    └──────┬──────┘                  └─────────┬────────┘
           │                                   │
           ▼                                   ▼
    ┌──────────────┐              ┌──────────────────────┐
    │  Frontend    │              │  WhatsApp Gateway    │
    └──────────────┘              └──────────────────────┘
```

---

## 📊 Monitoring

### Check System Status

```powershell
# Check indexed documents
python -c "from app.storage.pgvector import PgVectorStore; store = PgVectorStore(); print(f'Documents: {store.get_stats()}')"
```

### View Logs

Each service logs to console. For production, configure log files:

```python
# In your service
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/indexer.log'),
        logging.StreamHandler()
    ]
)
```

### Database Queries

```sql
-- Count documents and chunks
SELECT 
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(c.id) as total_chunks
FROM documents d
LEFT JOIN document_chunks c ON c.document_id = d.id;

-- Recent documents
SELECT 
    id,
    metadata->>'filename' as filename,
    created_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;

-- Search by filename
SELECT * FROM documents 
WHERE metadata->>'filename' LIKE '%criminal%';
```

---

## 🐛 Troubleshooting

### Issue: "pgvector extension not found"

**Solution:**
```sql
-- Connect as superuser
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "Gemini API authentication failed"

**Solution:**
1. Verify API key: https://aistudio.google.com/app/apikey
2. Check `.env` file has `GEMINI_API_KEY=AIzaSyC...`
3. Test: `python check_gemini.py`

### Issue: "Kafka connection timeout"

**Solution:**
1. Verify Kafka is running: `telnet localhost 9092`
2. Check `KAFKA_BROKER_URL` in `.env`
3. Verify topics exist:
   ```powershell
   kafka-topics.sh --list --bootstrap-server localhost:9092
   ```

### Issue: "No documents found" when querying

**Solution:**
1. Check if documents are indexed:
   ```sql
   SELECT COUNT(*) FROM documents;
   SELECT COUNT(*) FROM document_chunks;
   ```
2. Re-index if needed: `python bulk_index.py f:\legal-corpus`

---

## 🔐 Security Notes

- **API Keys:** Never commit `.env` to version control
- **Database:** Use strong passwords and connection pooling
- **Kafka:** Enable SSL/SASL for production
- **Azure Storage:** Use SAS tokens with minimal permissions

---

## 🚦 Production Checklist

- [ ] Enable HTTPS for API endpoints
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Splunk)
- [ ] Set up backup and disaster recovery
- [ ] Implement rate limiting on API
- [ ] Add authentication/authorization
- [ ] Set up CI/CD pipelines
- [ ] Configure auto-scaling for workers
- [ ] Set up alerting for failures
- [ ] Document runbooks for operations

---

## 📈 Performance Tuning

### Database

```sql
-- Increase shared buffers for better caching
ALTER SYSTEM SET shared_buffers = '4GB';

-- Tune work_mem for sorting
ALTER SYSTEM SET work_mem = '256MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Vector Index

```sql
-- Rebuild ivfflat index with more lists for better recall
DROP INDEX document_chunks_embedding_idx;
CREATE INDEX document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 500);

-- Run ANALYZE
ANALYZE document_chunks;
```

### Kafka

```properties
# Increase batch size for better throughput
batch.size=32768
linger.ms=10
compression.type=lz4
```

---

## 📝 License

This project is part of the Legal Aid platform. See main repository for license details.

---

## 🤝 Contributing

For questions or contributions, please see the main project README.

---

## 📞 Support

- Documentation: `docs/` folder
- Issues: GitHub Issues
- Team: See CONTRIBUTORS.md
