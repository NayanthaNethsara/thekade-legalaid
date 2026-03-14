"""LegalAid MCP Tool Server.

Provides tools for the LegalAid agent pipeline:
  - schedule_meeting: Schedule meetings with confirmation
  - rag_search: Semantic search over the legal knowledge base (pgvector)
"""

import os
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import google.generativeai as genai
import psycopg2
from mcp.server.fastmcp import FastMCP


mcp = FastMCP(
    name="kakille-mcp",
    instructions=(
        "Tools for LegalAid assistant. Includes meeting scheduling and "
        "RAG-powered legal knowledge retrieval."
    ),
    host="0.0.0.0",
    port=8080,
)

# ── Configuration ────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://legalaid:legalaid@localhost:5432/legalaid",
)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM = 768

# Database setup using SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _get_db_connection():
    """Create a fresh DB connection."""
    return psycopg2.connect(DATABASE_URL)


def embed_query(query: str) -> list[float]:
    """Embed a search query using gemini-embedding-001."""
    genai.configure(api_key=GEMINI_API_KEY)
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=query,
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=EMBEDDING_DIM,
    )
    return result["embedding"]


# ═════════════════════════════════════════════════════════════════════════
#  TOOLS
# ═════════════════════════════════════════════════════════════════════════


@mcp.tool()
def schedule_meeting(
    title: str,
    start_iso: str,
    duration_minutes: int,
    attendees: list[str],
    notes: str = "",
) -> dict[str, Any]:
    """Schedule a meeting and return confirmation details.

    Args:
        title: Meeting title.
        start_iso: Start time in ISO format (e.g. 2026-03-14T09:30:00Z).
        duration_minutes: Meeting duration in minutes.
        attendees: List of participant identifiers (email or phone).
        notes: Optional notes/agenda.
    """
    if duration_minutes <= 0:
        raise ValueError("duration_minutes must be > 0")

    if not attendees:
        raise ValueError("attendees must not be empty")

    start_at = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    meeting_id = f"meet_{uuid4().hex[:10]}"

    return {
        "status": "scheduled",
        "meeting": {
            "id": meeting_id,
            "title": title,
            "start_iso": start_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "duration_minutes": duration_minutes,
            "attendees": attendees,
            "notes": notes,
            "join_url": f"https://meet.kakille.local/{meeting_id}",
        },
    }


@mcp.tool()
def rag_search(query: str, top_k: int = 5) -> dict[str, Any]:
    """Search the legal knowledge base for relevant information.

    Performs semantic vector search over the document chunks using cosine
    similarity. Returns ranked results with source references.

    Args:
        query: The search query (natural language).
        top_k: Number of results to return (1-10, default 5).
    """
    top_k = max(1, min(top_k, 10))

    if not GEMINI_API_KEY:
        return {
            "mode": "error",
            "query": query,
            "results": [],
            "message": "GEMINI_API_KEY not configured — cannot generate embeddings.",
        }

    try:
        # 1. Embed the query
        query_embedding = _embed_query(query)
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        # 2. Search pgvector using cosine distance
        conn = _get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                dc.id,
                dc.text,
                dc.metadata,
                dc.chunk_index,
                d.source,
                d.metadata AS doc_metadata,
                1 - (dc.embedding <=> %s::vector) AS similarity
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            ORDER BY dc.embedding <=> %s::vector
            LIMIT %s
            """,
            (embedding_str, embedding_str, top_k),
        )

        rows = cur.fetchall()
        cur.close()
        conn.close()

        # 3. Format results
        results: list[dict[str, Any]] = []
        for row in rows:
            chunk_id, text, chunk_meta, chunk_idx, source, doc_meta, similarity = row

            # Extract source reference info.
            source_ref = "Unknown source"
            if doc_meta and isinstance(doc_meta, dict):
                filename = doc_meta.get("filename", "")
                if filename:
                    source_ref = filename

            results.append({
                "id": chunk_id,
                "score": round(float(similarity), 4),
                "text": text,
                "source": source_ref,
                "chunk_index": chunk_idx,
                "metadata": chunk_meta if isinstance(chunk_meta, dict) else {},
            })

        return {
            "mode": "live",
            "query": query,
            "results": results,
            "total_results": len(results),
        }

    except Exception as exc:
        return {
            "mode": "error",
            "query": query,
            "results": [],
            "message": f"RAG search failed: {exc}",
        }


if __name__ == "__main__":
    mcp.run(transport="sse")