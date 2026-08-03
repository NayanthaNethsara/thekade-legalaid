"""Shared context helper for workspace tools (sources, notes, reminders).

Workspace rows are scoped to ``(principal_kind, principal_id, conversation_id)``.
All three values come from the run config's thread id -- never from anything
the model supplies -- so a tool can only ever touch the calling user's rows.
"""

from langchain_core.runnables import RunnableConfig


def workspace_scope(config: RunnableConfig) -> tuple[str, str, str] | None:
    """Return ``(principal_kind, principal_id, conversation_id)`` or None."""
    configurable = (config or {}).get("configurable") or {}
    thread_id = configurable.get("thread_id")
    if not isinstance(thread_id, str):
        return None
    parts = thread_id.split(":", 2)
    if len(parts) != 3 or not all(parts):
        return None
    return (parts[0], parts[1], parts[2])
