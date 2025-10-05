import re
from datetime import datetime, timedelta
from typing import Optional

class NLPService:
    """
    Simple rule-based NLP for WhatsApp messages.
    Detects 'reminder' intent and extracts time and action.
    """

    reminder_keywords = ["remind", "reminder", "remember"]

    @staticmethod
    def parse_message(text: str) -> dict:
        """
        Returns structured intent data:
        - intent: 'reminder' / 'chat' / 'unknown'
        - action: task description (if reminder)
        - time: ISO string (if reminder)
        """
        text_lower = text.lower()

        # Check for reminder intent
        if any(word in text_lower for word in NLPService.reminder_keywords):
            # Extract time (basic: look for 'at HH' or 'at HH:MM')
            time_match = re.search(r"at (\d{1,2})(?::(\d{2}))?", text_lower)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2) or 0)
                now = datetime.now()
                reminder_time = datetime(
                    year=now.year,
                    month=now.month,
                    day=now.day,
                    hour=hour,
                    minute=minute
                )
                # If time already passed today, assume tomorrow
                if reminder_time < now:
                    reminder_time += timedelta(days=1)
                time_iso = reminder_time.isoformat()

            else:
                # Default time: now + 1 minute
                time_iso = (datetime.now() + timedelta(minutes=1)).isoformat()

            # Extract action (remove "remind me to" or "reminder to")
            action = re.sub(r"(remind me to |reminder to )", "", text_lower, flags=re.I).strip()
        
            return {
                "intent": "reminder",
                "action": action,
                "time": time_iso
            }

        # Could add more rules here for questions / other intents
        if text_lower.startswith(("what", "how", "why", "when")):
            return {"intent": "question", "text": text}
        
        return {"intent": "chat", "text": text}
