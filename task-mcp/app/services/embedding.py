import google.generativeai as genai
from app.core.config import settings

def embed_query(query: str) -> list[float]:
    """Embed a search query using the configured gemini model."""
    genai.configure(api_key=settings.GEMINI_API_KEY)
    result = genai.embed_content(
        model=settings.EMBEDDING_MODEL,
        content=query,
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=settings.EMBEDDING_DIM,
    )
    return result["embedding"]
