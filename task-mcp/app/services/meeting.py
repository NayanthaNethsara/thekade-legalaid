from datetime import UTC, datetime
from uuid import uuid4
from typing import Any

def schedule_meeting_logic(
    title: str,
    start_iso: str,
    duration_minutes: int,
    attendees: list[str],
    notes: str = "",
) -> dict[str, Any]:
    """Business logic for scheduling a meeting."""
    if duration_minutes <= 0:
        raise ValueError("duration_minutes must be > 0")

    if not attendees:
        raise ValueError("attendees must not be empty")

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
