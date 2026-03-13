from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from mcp.server.fastmcp import FastMCP


mcp = FastMCP(
    name="kakille-mcp",
    instructions=(
        "Tools for LegalAid assistant. Includes meeting scheduling and "
        "mock RAG responses while real retrieval is under development."
    ),
    host="0.0.0.0",
    port=8080,
)


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

    # Basic ISO validation
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
def rag_search_mock(query: str, top_k: int = 3) -> dict[str, Any]:
    """Return mocked RAG snippets for legal Q&A while real RAG is pending."""
    if top_k <= 0:
        raise ValueError("top_k must be > 0")

    top_k = min(top_k, 5)
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    results: list[dict[str, Any]] = []
    for i in range(top_k):
        results.append(
            {
                "id": f"mock_doc_{i+1}",
                "score": round(0.9 - (i * 0.12), 2),
                "source": "mock-legal-knowledge",
                "snippet": (
                    f"[MOCK RAG] Relevant context #{i+1} for query '{query}'. "
                    "This is placeholder data until live vector retrieval is enabled."
                ),
                "updated_at": now,
            }
        )

    return {
        "mode": "mock",
        "query": query,
        "results": results,
        "message": "Mock RAG is active. Replace with real retriever when ready.",
    }


if __name__ == "__main__":
    mcp.run(transport="sse")