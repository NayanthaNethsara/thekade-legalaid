"""Kakille MCP server: legal knowledge search over the RAG knowledge base.

Runs as its own process (``uvicorn app.mcp_server.main:app --port 8010``), not
mounted inside the main API. The orchestrator loads MCP tools during its
lifespan startup, and uvicorn does not serve requests until lifespan startup
finishes -- so a same-app mount would have the backend dialing itself before it
can answer.

The tool is a thin adapter over ``RAGService.retrieve_relevant_chunks``; the
ingestion and retrieval internals are owned elsewhere and are not touched here.
"""

import secrets

from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.session import get_sessionmaker
from app.repositories.rag_repository import RAGRepository
from app.services.rag_service import RAGService

logger = get_logger(__name__)

_TOP_K = 5

# Categories the knowledge base is organized by. Mirrors the top level of
# DOMAIN_KNOWLEDGE_PROMPT so the agent's category filter always resolves.
_CATEGORIES = (
    "Legislation",
    "Property Law",
    "Criminal Defense",
    "Family Law",
    "Labor & Employment",
)

mcp = FastMCP("kakille-legal", stateless_http=True)


def _rag_service() -> RAGService:
    return RAGService(repository=RAGRepository(get_sessionmaker()))


@mcp.tool()
async def kakille_search_legal_knowledge(query: str, category: str = "") -> str:
    """Search the Sri Lankan legal knowledge base for passages answering a legal question.

    Pass the legal concept as the query ("maintenance claim procedure"), not the
    user's whole story. Optionally narrow with `category`, which must be exactly
    one of: Legislation, Property Law, Criminal Defense, Family Law,
    Labor & Employment. Leave it empty when unsure.
    """
    cleaned_query = query.strip()
    if not cleaned_query:
        return "No query supplied. Pass the legal concept to search for."

    category_filter = category.strip() or None
    if category_filter and category_filter not in _CATEGORIES:
        return (
            f"'{category_filter}' is not a valid category. Use one of: "
            f"{', '.join(_CATEGORIES)}, or leave it empty."
        )

    try:
        chunks = await _rag_service().retrieve_relevant_chunks(
            cleaned_query, top_k=_TOP_K, category_filter=category_filter
        )
    except Exception as error:
        logger.exception("mcp.legal_search_failed", query=cleaned_query, error=str(error))
        return "The legal knowledge base could not be reached. Tell the user and continue."

    if not chunks:
        return (
            f"No matching legal knowledge found for '{cleaned_query}'"
            f"{f' in {category_filter}' if category_filter else ''}."
        )

    blocks = [f"[{chunk.document_title} — {chunk.category}]\n{chunk.content}" for chunk in chunks]
    return "\n\n".join(blocks)


class _BearerAuthMiddleware:
    """Reject callers without the shared MCP bearer secret.

    Skipped entirely when no key is configured, which is the local dev default.
    """

    def __init__(self, app: ASGIApp, api_key: str) -> None:
        self._app = app
        self._api_key = api_key

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not self._api_key:
            await self._app(scope, receive, send)
            return

        header = Request(scope).headers.get("authorization", "")
        expected = f"Bearer {self._api_key}"
        if not secrets.compare_digest(header, expected):
            response: Response = JSONResponse({"detail": "Unauthorized"}, status_code=401)
            await response(scope, receive, send)
            return

        await self._app(scope, receive, send)


def create_app() -> Starlette:
    settings = get_settings()
    configure_logging(settings.log_level)
    streamable_app = mcp.streamable_http_app()
    streamable_app.add_middleware(_BearerAuthMiddleware, api_key=settings.mcp.api_key)
    logger.info("mcp.server.ready", auth="enabled" if settings.mcp.api_key else "disabled")
    return streamable_app


app = create_app()
