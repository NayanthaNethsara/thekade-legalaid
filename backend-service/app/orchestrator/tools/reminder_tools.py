"""Local tools for the user's workspace reminders.

Reminders created here appear immediately in the Case Studio panel for this
conversation.
"""

import datetime

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.orchestrator.tools.workspace_common import workspace_scope
from app.repositories.reminder_repository import ReminderRepository


def build_reminder_tools(reminder_repo: ReminderRepository) -> list[BaseTool]:
    @tool
    async def add_reminder(title: str, config: RunnableConfig, due_date: str = "") -> str:
        """Save a reminder to the user's workspace for this conversation.

        Use this when the user asks to be reminded of something (a deadline, a
        hearing, a document to file). ``due_date`` must be an absolute date in
        YYYY-MM-DD format -- resolve relative phrases like "next Friday" against
        today's date before calling. Leave it empty when no date was given.
        """
        scope = workspace_scope(config)
        if not scope:
            return "Unable to access reminders. User context is missing."
        text = title.strip()
        if not text:
            return "Cannot save a reminder without a title."

        parsed_date: datetime.date | None = None
        if due_date.strip():
            try:
                parsed_date = datetime.date.fromisoformat(due_date.strip())
            except ValueError:
                return (
                    f"'{due_date}' is not a valid date. Pass the due date in "
                    "YYYY-MM-DD format, or leave it empty."
                )

        kind, principal_id, conversation_id = scope
        await reminder_repo.create(kind, principal_id, conversation_id, text, parsed_date)
        if parsed_date:
            return f"Saved the reminder '{text}' due {parsed_date.isoformat()}."
        return f"Saved the reminder '{text}'."

    @tool
    async def list_reminders(config: RunnableConfig) -> str:
        """List the reminders saved in the user's workspace for this conversation.

        Use this when the user asks about their reminders or upcoming deadlines.
        """
        scope = workspace_scope(config)
        if not scope:
            return "Unable to access reminders. User context is missing."
        kind, principal_id, conversation_id = scope
        reminders = await reminder_repo.list_for_conversation(kind, principal_id, conversation_id)
        if not reminders:
            return "There are no reminders in this conversation's workspace."
        lines = []
        for reminder in reminders:
            due = f" (due {reminder.due_date.isoformat()})" if reminder.due_date else ""
            done = " [done]" if reminder.is_done else ""
            lines.append(f"- {reminder.title}{due}{done}")
        return "Reminders in this conversation:\n" + "\n".join(lines)

    return [add_reminder, list_reminders]
