# RAG System Operations Runbook

Quick reference guide for operating the RAG system.

---

## 🚀 Quick Commands

### Start Services

```powershell
# API only (for frontend)
.\start-rag-api.ps1

# Indexer only (for background indexing)
.\start-indexer.ps1

# Query consumer (for WhatsApp)
.\start-rag-query-consumer.ps1
```

### Index Documents

```powershell
# Local indexing (direct to database)
python bulk_index.py f:\legal-corpus

# Event-driven indexing (via NATS JetStream)
python bulk_index.py f:\legal-corpus --emit-nats-events

# With Azure Blob backup
python bulk_index.py f:\legal-corpus --upload-to-blob --emit-nats-events
```

### Test System

```powershell
# Validate setup
python validate_setup.py

# Test API
python test_rag_api.py

# Test specific endpoint
curl http://localhost:8000/api/rag/stats
```

---

## 📊 Monitoring

### Check System Health

```sql
-- Database stats
SELECT
    COUNT(DISTINCT d.id) as documents,
    COUNT(c.id) as chunks,
    pg_size_pretty(pg_total_relation_size('document_chunks')) as storage
FROM documents d
LEFT JOIN document_chunks c ON c.document_id = d.id;

-- Recent activity
SELECT
    source,
    COUNT(*) as count,
    MAX(created_at) as last_indexed
FROM documents
GROUP BY source
ORDER BY last_indexed DESC;
```

### Worker Status

```powershell
# Check if processes are running
Get-Process python | Where-Object {$_.MainWindowTitle -like "*indexer*"}

# Check logs
Get-Content logs/indexer.log -Tail 50
```

---

## 🔧 Troubleshooting

### "Database connection failed"

```powershell
# Check PostgreSQL is running
Get-Service postgresql-x64-14

# Test connection
python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
psql $env:DATABASE_URL
```

### "NATS JetStream timeout"

```powershell
# Check NATS JetStream is running
Test-NetConnection localhost -Port 4222

# List streams and subjects
nats stream ls
nats stream info LEGALAID_EVENTS
```

### "No similar chunks found"

```sql
-- Check if chunks exist
SELECT COUNT(*) FROM document_chunks;

-- If zero, reindex
python bulk_index.py f:\legal-corpus
```

### "Gemini API error"

```powershell
# Test API key
python check_gemini.py

# Verify key in .env
$env:GEMINI_API_KEY
```

---

## 🔄 Common Tasks

### Reindex All Documents

```powershell
# Backup first
pg_dump legalaid > backup.sql

# Clear existing
psql -c "TRUNCATE document_chunks, documents RESTART IDENTITY CASCADE;"

# Reindex
python bulk_index.py f:\legal-corpus
```

### Update Single Document

```powershell
# Delete old version
python -c "
from app.storage.pgvector import PgVectorStore
store = PgVectorStore()
# Delete by ID
"

# Reindex specific file
python bulk_index.py f:\legal-corpus\specific-doc.pdf
```

### Scale Workers

```powershell
# Terminal 1
.\start-indexer.ps1

# Terminal 2
.\start-indexer.ps1

# Terminal 3
.\start-indexer.ps1
```

---

## 🚨 Emergency Procedures

### Service Not Responding

1. Check logs for errors
2. Restart service (Ctrl+C, then restart script)
3. Check database connection
4. Verify NATS JetStream connectivity

### High CPU Usage

1. Check number of workers running
2. Reduce batch size in config
3. Add delay between operations

### Database Full

```sql
-- Check size
SELECT pg_size_pretty(pg_database_size('legalaid'));

-- Clean up test data
DELETE FROM documents WHERE metadata->>'test' = 'true';

-- Vacuum
VACUUM FULL document_chunks;
```

---

## 📈 Performance Tuning

### Optimize Vector Search

```sql
-- Rebuild index with more lists
DROP INDEX document_chunks_embedding_idx;
CREATE INDEX document_chunks_embedding_idx
ON document_chunks
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 500);
ANALYZE document_chunks;
```

### Increase Batch Size

Edit `.env`:

```env
CHUNK_SIZE=1500  # Default: 1000
```

### Cache Query Results

Enable Redis in `.env`:

```env
REDIS_URL=redis://localhost:6379
```

---

## 📝 Maintenance Schedule

### Daily

- [ ] Check service logs for errors
- [ ] Monitor query latency
- [ ] Verify workers are running

### Weekly

- [ ] Review database growth
- [ ] Check index performance
- [ ] Update corpus if needed

### Monthly

- [ ] Full database backup
- [ ] Review and optimize queries
- [ ] Update dependencies
- [ ] Rotate logs

---

## 🔐 Security Checklist

- [ ] API key in `.env` (not committed)
- [ ] Database password is strong
- [ ] NATS JetStream SSL enabled (production)
- [ ] API endpoints behind auth (production)
- [ ] Blob storage uses SAS tokens
- [ ] Regular security updates

---

## 📞 Contacts

| Role     | Responsibility       |
| -------- | -------------------- |
| Dev Team | Application issues   |
| DBA      | Database performance |
| DevOps   | Infrastructure       |
| Security | Access control       |

---

## 📚 Reference

- **Architecture:** `docs/rag-architecture.md`
- **Quick Start:** `docs/RAG-QUICKSTART.md`
- **Phase 1:** `docs/rag-phase1-setup.md`
- **Phase 2:** `docs/rag-phase2-setup.md`
- **Phase 3:** `docs/rag-phase3-setup.md`
- **API Docs:** `http://localhost:8000/docs`
