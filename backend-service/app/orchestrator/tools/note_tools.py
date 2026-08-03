"""Local tools for the user's workspace notes.

Notes created here appear immediately in the Case Studio panel for this
conversation.
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.orchestrator.tools.workspace_common import workspace_scope
from app.repositories.note_repository import NoteRepository


def build_note_tools(note_repo: NoteRepository) -> list[BaseTool]:
    @tool
    async def add_note(content: str, config: RunnableConfig) -> str:
        """Save a note to the user's workspace for this conversation.

        Use this when the user asks to note something down, save a summary, or
        keep a piece of information for later. Keep the note short and factual.
        """
        scope = workspace_scope(config)
        if not scope:
            return "Unable to access notes. User context is missing."
        text = content.strip()
        if not text:
            return "Cannot save an empty note."
        kind, principal_id, conversation_id = scope
        await note_repo.create(kind, principal_id, conversation_id, text)
        return "Saved the note to the workspace."

    @tool
    async def list_notes(config: RunnableConfig) -> str:
        """List the notes saved in the user's workspace for this conversation.

        Use this when the user asks what notes they have or refers to an
        earlier note.
        """
        scope = workspace_scope(config)
        if not scope:
            return "Unable to access notes. User context is missing."
        kind, principal_id, conversation_id = scope
        notes = await note_repo.list_for_conversation(kind, principal_id, conversation_id)
        if not notes:
            return "There are no notes in this conversation's workspace."
        lines = [f"- {note.content}" for note in notes]
        return "Notes in this conversation:\n" + "\n".join(lines)

    return [add_note, list_notes]
