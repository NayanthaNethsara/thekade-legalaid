from typing import Any
from app.core.database import get_db_connection
from app.services.embedding import embed_query
from app.core.config import settings

def register_rag_tool(mcp):
    @mcp.tool()
    def rag_search(query: str, top_k: int = 5) -> dict[str, Any]:
        """Search the legal knowledge base for relevant information.

        Args:
            query: The search query (natural language).
            top_k: Number of results to return (1-10, default 5).
        """
        top_k = max(1, min(top_k, 10))

        if not settings.GEMINI_API_KEY:
            return {
                "mode": "error",
                "query": query,
                "results": [],
                "message": "GEMINI_API_KEY not configured — cannot generate embeddings.",
            }

        try:
            # 1. Embed the query
            query_embedding = embed_query(query)
            embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

            # 2. Search pgvector using cosine distance
            conn = get_db_connection()
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
