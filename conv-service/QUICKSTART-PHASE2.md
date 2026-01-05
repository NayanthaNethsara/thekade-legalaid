# Quick Start Guide - Phase 2 RAG Testing

## 🎯 You're Ready to Test!

I've set up everything you need to test the Phase 2 bulk indexing system.

### ✅ What's Already Done

1. **Dependencies Installed**: All required Python packages are installed
2. **Database Configured**: Now using Supabase production database
3. **Sample Corpus Created**: Two sample legal documents in `f:\legal-corpus\sample-documents\`

### 📋 Step-by-Step: Run Your First Index

```powershell
# 1. Make sure you're in the conv-service directory with venv activated
cd F:\thekade-legalaid\conv-service
& F:/thekade-legalaid/conv-service/.venv/Scripts/Activate.ps1

# 2. Run database migrations to create RAG tables
alembic upgrade head

# 3. Index the sample documents (without Azure/Kafka for now)
python bulk_index.py f:\legal-corpus\sample-documents

# 4. Verify the indexing worked
# You should see output like:
#   ✅ Indexed motor-traffic-act-sample.txt: document_id=1, chunks=X
#   ✅ Indexed penal-code-sample.txt: document_id=2, chunks=Y
```

### 🧪 Test with Azure Blob and Kafka (Optional)

Once basic indexing works, test with cloud features:

```powershell
# Configure Azure Storage and Kafka in .env first, then:
python bulk_index.py f:\legal-corpus\sample-documents --upload-to-blob --emit-kafka-events
```

### 📁 Sample Documents Included

I've created two sample legal documents for you:

1. **motor-traffic-act-sample.txt** - Road traffic laws, speed limits, licensing requirements
2. **penal-code-sample.txt** - Criminal offenses, theft, robbery, assault laws

Both are formatted to be representative of real legal documents but clearly marked as samples.

### ⚙️ Configuration Changes Made

**Updated `.env`:**
- ✅ Now using Supabase production database
- ⚠️ You still need to add: `GEMINI_API_KEY=your_key_here`
- ✅ Switched to Google Gemini (FREE) instead of OpenAI

**Get Free Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste into `.env` as `GEMINI_API_KEY=...`

### 🔍 Verify Database After Indexing

After running the bulk indexer, connect to Supabase and check:

```sql
-- Check documents
SELECT id, source, metadata->>'filename' as filename, created_at 
FROM documents 
ORDER BY created_at DESC;

-- Check chunks
SELECT COUNT(*) as total_chunks FROM document_chunks;

-- View a sample chunk
SELECT text, metadata 
FROM document_chunks 
LIMIT 3;
```

### 🚨 Troubleshooting

**If `alembic upgrade head` fails:**
- The database might need the `pgvector` extension enabled
- Run this in Supabase SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;`

**If bulk_index.py fails with Gemini error:**
- Get a free API key from https://aistudio.google.com/app/apikey
- Add to `.env`: `GEMINI_API_KEY=your_key_here`

**To switch back to local PostgreSQL later:**
- Uncomment the local DATABASE_URL in `.env`
- Comment out the Supabase URL
- Start your local PostgreSQL

### 📚 Next Steps After Successful Indexing

1. ✅ Verify documents and chunks are in database
2. 🔜 Proceed to Phase 3 (Indexer Worker)
3. 🔜 Implement Phase 4 (RAG Query Handler)

### 📖 Full Documentation

- [Phase 2 Setup Guide](../docs/rag-phase2-setup.md)
- [Phase 2 Summary](./PHASE2-SUMMARY.md)
- [RAG Architecture](../docs/rag-architecture.md)

---

**Ready to run?** Execute the commands above and you should see your first RAG index being built! 🚀
