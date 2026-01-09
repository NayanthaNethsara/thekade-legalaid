import os
from dotenv import load_dotenv

# Load conv-service/.env so the GEMINI key set there is available to this script
load_dotenv(dotenv_path=r"F:/thekade-legalaid/conv-service/.env")

print("GEMINI_API_KEY set:", bool(os.getenv("GEMINI_API_KEY")))
key = os.getenv("GEMINI_API_KEY")
print("GEMINI_API_KEY preview:", None if not key else key[:8] + "...")
try:
    import google.generativeai as genai
except Exception as e:
    print("IMPORT_ERROR:", e)
    raise SystemExit(0)
try:
    genai.configure(api_key=key)
    try:
        r = genai.embed_content(model="models/embedding-001", content=["test"])
        print("EMBED_OK:", type(r))
        print(r)
    except Exception as e:
        print("EMBED_ERROR:", e)
except Exception as e:
    print("CONFIG_ERROR:", e)
