"""MCP tool loader for the LegalAid agent.

Tools live in the task-mcp MCP server (RAG search, meeting scheduling, etc.).
At startup, `load_mcp_tools()` connects to the server and returns a list of
LangChain-compatible tools that LangGraph's ToolNode can call.

If MCP_SERVER_URL is not set (e.g. during local dev) the agent still works,
just without tool calls.
"""

from typing import List

from langchain_core.tools import BaseTool

from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


async def load_mcp_tools() -> List[BaseTool]:
    """Connect to the MCP server and return all available tools.

    Returns an empty list if the server URL is not configured or the
    connection fails – the agent will still function as a plain LLM.
    """
    if not settings.MCP_SERVER_URL:
        logger.warning("MCP_SERVER_URL not set – running without MCP tools")
        return []

    try:
        # langchain-mcp-adapters provides MultiServerMCPClient which translates
        # MCP tool schemas into LangChain BaseTool instances.
        from langchain_mcp_adapters.client import MultiServerMCPClient  # type: ignore

        client = MultiServerMCPClient(
            {
                "legalaid-tools": {
                    "url": settings.MCP_SERVER_URL,
                    "transport": "sse",
                }
            }
        )
        tools = await client.get_tools()
        logger.info(f"Loaded {len(tools)} tools from MCP server at {settings.MCP_SERVER_URL}")
        return tools

    except ImportError:
        logger.warning(
            "langchain-mcp-adapters not installed – cannot load MCP tools. "
            "Run: pip install langchain-mcp-adapters"
        )
        return []
    except Exception as exc:
        logger.error(f"Failed to load MCP tools: {exc}")
        return []
