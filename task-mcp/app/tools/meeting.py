from typing import Any
from app.services.meeting import schedule_meeting_logic

def register_meeting_tool(mcp):
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
        return schedule_meeting_logic(
            title=title,
            start_iso=start_iso,
            duration_minutes=duration_minutes,
            attendees=attendees,
            notes=notes,
        )
