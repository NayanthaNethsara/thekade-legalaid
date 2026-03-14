from mcp.server.fastmcp import FastMCP
from app.tools.meeting import register_meeting_tool
from app.tools.rag import register_rag_tool

def create_app() -> FastMCP:
    """Initialize FastMCP and register all tools."""
    mcp = FastMCP(
        name="kakille-mcp",
        instructions=(
            "Tools for LegalAid assistant. Includes meeting scheduling and "
            "RAG-powered legal knowledge retrieval."
        ),
        host="0.0.0.0",
        port=8080,
    )

    # Register tools
    register_meeting_tool(mcp)
    register_rag_tool(mcp)

    return mcp

mcp = create_app()

if __name__ == "__main__":
    mcp.run(transport="sse")
