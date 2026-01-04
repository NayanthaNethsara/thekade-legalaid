# RAG Phase 1 — Infrastructure Setup Guide

This guide walks you through setting up the infrastructure required for the RAG (Retrieval-Augmented Generation) feature.

## Prerequisites
- PostgreSQL 12+ with superuser access (to enable extensions)
- Kafka cluster (local or hosted)
- Redis instance (optional but recommended)
- Azure Blob Storage account
- OpenAI API key (or Azure OpenAI endpoint)

---

## 1. PostgreSQL + pgvector Setup

### Install pgvector extension

**For managed PostgreSQL (Azure Database for PostgreSQL, AWS RDS, etc.):**
```sql
-- Connect as superuser or admin
CREATE EXTENSION IF NOT EXISTS vector;
```

**For self-hosted PostgreSQL (Ubuntu/Debian):**
```bash
# Install build dependencies
sudo apt-get install -y postgresql-server-dev-all build-essential git

# Clone and build pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**For Docker:**
```yaml
# docker-compose.yml excerpt
services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: legalaid
    ports:
      - "5432:5432"
```

### Verify installation
```sql
-- Connect to your database
CREATE EXTENSION IF NOT EXISTS vector;

-- Test vector operations
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance;
```

---

## 2. Run Database Migrations

```bash
cd conv-service

# Install dependencies
pip install -r requirements.txt

# Set DATABASE_URL in .env (see .env.example)
# DATABASE_URL=postgresql://user:password@localhost:5432/legalaid

# Run migrations
alembic upgrade head
```

This will:
- Enable the `pgvector` extension
- Create `documents` table
- Create `document_chunks` table with `vector(1536)` column
- Create IVFFlat index for fast similarity search

### Verify migration
```sql
-- Check tables exist
\dt

-- Check vector column
\d document_chunks

-- Expected output should include:
-- embedding | vector(1536) | not null
```

---

## 3. Kafka Topics Setup

Create the following Kafka topics. Adjust partitions and replication factor based on your cluster size.

### Using Kafka CLI:
```bash
# indexing.trusted_files - for admin-uploaded trusted documents
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic indexing.trusted_files \
  --partitions 3 \
  --replication-factor 1

# rag.queries - for RAG query requests
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic rag.queries \
  --partitions 3 \
  --replication-factor 1

# whatsapp.outgoing.messages - may already exist
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic whatsapp.outgoing.messages \
  --partitions 3 \
  --replication-factor 1 \
  --if-not-exists
```

### Using Confluent Cloud:
```bash
confluent kafka topic create indexing.trusted_files --partitions 3
confluent kafka topic create rag.queries --partitions 3
confluent kafka topic create whatsapp.outgoing.messages --partitions 3 --if-not-exists
```

### Verify topics:
```bash
kafka-topics.sh --list --bootstrap-server localhost:9092
```

---

## 4. Redis Setup (Optional but Recommended)

Redis is used for:
- Chat history caching (last N messages per user)
- Embedding result caching (to reduce API costs)

### Docker:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Docker Compose:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Managed Redis:
- Azure Cache for Redis
- AWS ElastiCache
- Upstash (serverless)

### Verify Redis:
```bash
redis-cli ping
# Should return: PONG
```

---

## 5. Azure Blob Storage

Ensure you have:
- An Azure Storage Account
- A container for legal documents (e.g., `legal-corpus`)
- Connection string or SAS token

Get your connection string:
```bash
# Azure CLI
az storage account show-connection-string \
  --name your_storage_account \
  --resource-group your_resource_group
```

---

## 6. OpenAI API Setup

### Option A: OpenAI API
1. Sign up at https://platform.openai.com
2. Create an API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Option B: Azure OpenAI
1. Deploy an embedding model (e.g., `text-embedding-3-small`)
2. Deploy a chat model (e.g., `gpt-4`)
3. Get endpoint and key
4. Update `conv-service` code to use Azure OpenAI SDK

---

## 7. Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cd conv-service
cp .env.example .env
```

Required variables:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/legalaid
DIRECT_URL=postgresql://user:password@localhost:5432/legalaid

# OpenAI
OPENAI_API_KEY=sk-...

# Kafka
KAFKA_BROKER_URL=localhost:9092
# or for Confluent Cloud:
# KAFKA_BROKER_URL=pkc-xxxxx.region.provider.confluent.cloud:9092
# KAFKA_USERNAME=...
# KAFKA_PASSWORD=...
# KAFKA_SSL=true
# KAFKA_SASL_MECHANISM=PLAIN

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

---

## 8. Verify Phase 1 Setup

Run these checks to confirm everything is ready:

### Database:
```bash
cd conv-service
alembic current
# Should show: d403647b5c4b (head)

# Test connection
python -c "
from app.core.config import settings
import psycopg2
conn = psycopg2.connect(settings.DATABASE_URL)
print('✓ Database connection OK')
conn.close()
"
```

### Kafka:
```bash
# List topics
kafka-topics.sh --list --bootstrap-server localhost:9092 | grep -E '(indexing.trusted_files|rag.queries)'
```

### Redis:
```bash
redis-cli ping
```

### OpenAI:
```bash
python -c "
from openai import OpenAI
from app.core.config import settings
client = OpenAI(api_key=settings.OPENAI_API_KEY)
r = client.embeddings.create(model='text-embedding-3-small', input='test')
print(f'✓ OpenAI API OK (embedding dim: {len(r.data[0].embedding)})')
"
```

---

## 9. Next Steps (Phase 2)

Once Phase 1 is complete:
- ✅ Postgres with pgvector enabled
- ✅ Database schema migrated
- ✅ Kafka topics created
- ✅ Redis running (optional)
- ✅ Credentials configured

Proceed to **Phase 2: Admin Pre-feed Tooling & Bulk Index**
- Implement `tools/bulk_index.py`
- Create admin CLI to upload trusted PDFs
- Test indexing pipeline

---

## Troubleshooting

### pgvector not found
```sql
-- Check available extensions
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- If not listed, pgvector needs to be installed on the PostgreSQL server
```

### Kafka connection refused
- Check Kafka is running: `docker ps | grep kafka`
- Verify `KAFKA_BROKER_URL` in `.env`
- For cloud Kafka, check SSL/SASL settings

### OpenAI rate limits
- Start with small test dataset
- Implement exponential backoff
- Consider batch embedding requests
- Monitor usage at https://platform.openai.com/usage

### Alembic migration fails
```bash
# Check current revision
alembic current

# If stuck, downgrade and retry
alembic downgrade -1
alembic upgrade head

# View SQL without running
alembic upgrade head --sql
```

---

For questions or issues, refer to:
- [RAG Architecture](./rag-architecture.md)
- pgvector docs: https://github.com/pgvector/pgvector
- OpenAI API docs: https://platform.openai.com/docs
