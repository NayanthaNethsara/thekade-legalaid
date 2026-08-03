"""Local tools for reading the user's uploaded sources.

Sources are the case files, links, and pasted text the user added in the
workspace panel. Tools are read-only: intake happens through the REST API.
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.orchestrator.tools.workspace_common import workspace_scope
from app.repositories.source_repository import SourceRepository

_READ_CHUNK_CHARS = 8000


def build_source_tools(source_repo: SourceRepository) -> list[BaseTool]:
    @tool
    async def list_sources(config: RunnableConfig) -> str:
        """List the documents, links, and text the user has added as sources for
        this conversation, with each source's id and whether it is selected.

        Use this before answering questions about the user's own documents, then
        read the relevant ones with read_source.
        """
        scope = workspace_scope(config)
        if not scope:
            return "Unable to access sources. User context is missing."
        kind, principal_id, conversation_id = scope
        sources = await source_repo.list_for_conversation(kind, principal_id, conversation_id)
        if not sources:
            return "The user has not added any sources to this conversation."
        lines = [
            f"- id={source.id} | {source.kind} | {source.name}"
            f"{' | selected' if source.is_selected else ' | not selected'}"
            for source in sources
        ]
        return "Sources in this conversation:\n" + "\n".join(lines)

    @tool
    async def read_source(source_id: str, config: RunnableConfig) -> str:
        """Read the extracted text of one source by its id (from list_sources).

        Use this to ground answers about the user's own documents. Never invent
        content for a source you have not read.
        """
        scope = workspace_scope(config)
        if not scope:
            return "Unable to access sources. User context is missing."
        kind, principal_id, _ = scope
        found = await source_repo.get_content(source_id, kind, principal_id)
        if found is None:
            return f"No source with id {source_id} exists in this conversation."
        name, content = found
        if not content:
            return (
                f"Source '{name}' has no extracted text available "
                "(it may be an image, video link, or unreadable file)."
            )
        if len(content) > _READ_CHUNK_CHARS:
            return (
                f"Content of '{name}' (truncated to the first "
                f"{_READ_CHUNK_CHARS} characters):\n{content[:_READ_CHUNK_CHARS]}"
            )
        return f"Content of '{name}':\n{content}"

    return [list_sources, read_source]
