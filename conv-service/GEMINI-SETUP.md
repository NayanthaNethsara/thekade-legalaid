# 🆓 Using Google Gemini (FREE) for Embeddings

## Why Gemini?

This project uses **Google Gemini API** for embeddings instead of OpenAI because:
- ✅ **Completely FREE** - No credit card required
- ✅ **768-dimensional embeddings** - Good quality for legal text
- ✅ **15 RPM free tier** - Sufficient for development and small-scale production
- ✅ **Easy to get started** - Simple API key generation

## Get Your Free API Key

### Step 1: Visit Google AI Studio
Go to: https://aistudio.google.com/app/apikey

### Step 2: Sign in with Google
Use any Google account (Gmail)

### Step 3: Create API Key
1. Click **"Create API Key"** button
2. Select a Google Cloud project (or create a new one)
3. Copy the generated API key

### Step 4: Add to Your `.env` File
```env
GEMINI_API_KEY=AIzaSyC...your_key_here
```

## API Limits (Free Tier)

- **Embeddings:** 15 requests per minute (RPM)
- **Rate Limit:** 1500 requests per day
- **Cost:** $0.00 (completely free)

For our bulk indexing:
- ~15 documents per minute
- ~21,600 documents per day
- More than enough for development and testing!

## Model Used

**Model:** `models/embedding-001`
- **Dimension:** 768
- **Task Type:** `retrieval_document` (optimized for document retrieval)
- **Quality:** Comparable to OpenAI's text-embedding-3-small

## Embedding Comparison

| Provider | Model | Dimension | Cost | Free Tier |
|----------|-------|-----------|------|-----------|
| **Google Gemini** | embedding-001 | 768 | FREE | ✅ Yes |
| OpenAI | text-embedding-3-small | 1536 | $0.02/1M tokens | ❌ No |
| OpenAI | text-embedding-3-large | 3072 | $0.13/1M tokens | ❌ No |

## Quick Test

After adding your API key, test it:

```powershell
cd conv-service
python -c "import google.generativeai as genai; genai.configure(api_key='YOUR_KEY'); print(genai.embed_content(model='models/embedding-001', content='test')['embedding'][:5])"
```

You should see output like: `[0.0234, -0.0123, 0.0456, ...]`

## Troubleshooting

### Error: "API key not valid"
- Make sure you copied the entire key
- Check for extra spaces in `.env`
- Regenerate the key if needed

### Error: "Resource exhausted"
- You've hit the 15 RPM limit
- Wait 60 seconds and try again
- Consider reducing batch size in bulk indexer

### Error: "Permission denied"
- Enable the Generative AI API in Google Cloud Console
- Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com

## Configuration Files Updated

The following files have been updated to use Gemini:

1. ✅ `app/core/config.py` - Added `GEMINI_API_KEY` and `GEMINI_EMBEDDING_MODEL`
2. ✅ `app/services/embeddings.py` - Switched from OpenAI to Gemini API
3. ✅ `requirements.txt` - Replaced `openai` with `google-generativeai`
4. ✅ `alembic/versions/...` - Updated vector dimension from 1536 to 768
5. ✅ `.env` - Added Gemini configuration

## Next Steps

1. Get your free API key from https://aistudio.google.com/app/apikey
2. Add it to `conv-service/.env`
3. Install the new dependency: `pip install google-generativeai`
4. Run the bulk indexer: `python bulk_index.py f:\legal-corpus\sample-documents`

---

**Note:** Gemini's free tier is perfect for development and small to medium-scale production. For very large-scale deployments (>1M documents), consider the paid tier or alternative solutions.
