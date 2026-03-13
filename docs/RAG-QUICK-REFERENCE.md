# 🚀 RAG System - Quick Reference

## 🎯 System Status
**✅ OPERATIONAL** | 217 chunks indexed | 2-3s response time | 100% tests passing

## ⚡ Quick Commands

### Start Services
```powershell
# RAG API Server
cd conv-service
.\start-rag-api.ps1

# Frontend
cd frontend
npm run dev
```

### Testing
```powershell
# Full validation
python validate_setup.py

# API tests
python test_rag_api.py

# Health check
curl http://localhost:8000/api/v1/rag/health
```

### Indexing
```powershell
# Index documents
python bulk_index.py <path-to-documents>

# Example
python bulk_index.py F:\thekade-legalaid\docs\data
```

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/rag/query` | POST | Query RAG system |
| `/api/v1/rag/stats` | GET | Get system stats |
| `/api/v1/rag/health` | GET | Health check |
| `/` | GET | Root endpoint |

## 💡 Example Query

### cURL
```bash
curl -X POST http://localhost:8000/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the penalties for drunk driving?",
    "top_k": 5
  }'
```

### Frontend Hook
```typescript
import { useRAG } from "@/hooks/use-rag";

const { query, loading, error } = useRAG();
const result = await query("Your question here");
```

### Component
```typescript
import { RAGChatWindow } from "@/components/RAGChatWindow";

<RAGChatWindow />
```

## 🔧 Configuration

### Environment Variables (conv-service/.env)
```env
GEMINI_API_KEY=your_key_here
GEMINI_EMBEDDING_MODEL=models/text-embedding-004
VECTOR_DIM=768
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RAG_TOP_K=5
```

### Frontend (.env.local)
```env
RAG_API_URL=http://localhost:8000
```

## 📊 Current Stats
- **Documents**: 9 (2 legal PDFs + test docs)
- **Chunks**: 217
- **Vector Dimension**: 768
- **Embedding Model**: text-embedding-004
- **LLM Model**: gemini-2.5-flash

## 🐛 Troubleshooting

### No results returned
```powershell
# Check if documents are indexed
python validate_setup.py

# Re-index if needed
python bulk_index.py F:\thekade-legalaid\docs\data
```

### API connection error
```powershell
# Ensure server is running
.\start-rag-api.ps1

# Check if port 8000 is available
netstat -ano | findstr :8000
```

### Vector dimension mismatch
```powershell
# Fix database schema
python fix_vector_dimension.py
```

## 📚 Documentation
- [📖 Integration Status](RAG-INTEGRATION-STATUS.md) - Complete guide
- [📖 Implementation Success](IMPLEMENTATION-SUCCESS.md) - Summary
- [📖 Architecture](rag-architecture.md) - System design
- [📖 Quick Start](RAG-QUICKSTART.md) - Getting started

## ✅ Health Check
```bash
# Should return: {"status": "ok", ...}
curl http://localhost:8000/api/v1/rag/health

# Should show 217 chunks
curl http://localhost:8000/api/v1/rag/stats
```

## 🎯 Next Steps
1. 🚧 WhatsApp Integration (NATS JetStream)
2. 💾 Redis Session Management
3. 📈 Evaluation Metrics
4. 🔒 Security Hardening

---
**Last Updated**: January 8, 2026 | **Status**: ✅ Production Ready
