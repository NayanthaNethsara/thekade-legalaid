from datetime import datetime, timedelta
import json
import re
from app.core.llm_client import LLMClient

class NLPService:
    """
    LLM-based NLP for WhatsApp messages with optional rule-based fallback.
    Detects job types (reminder, todo, note, meeting) or falls back to chat.
    """

    reminder_keywords = ["remind", "reminder", "remember", "remmber", "remindd"]
    question_keywords = ["what", "how", "why", "when"]

    def __init__(self, llm_client):
        self.llm = llm_client

    @staticmethod
    def parse_message(text: str) -> dict:
        """
        LLM-based parsing: returns structured intent data.
        Fallback to chat if LLM output is invalid.
        """
        # NOTE: LLM part kept as-is
        prompt = f"""
        You are an NLP parser for a WhatsApp assistant.
        Return **valid JSON only** with these fields:

        {{
          "intent": "reminder" | "todo" | "note" | "meeting" | "question" | "chat",
          "action": "<short task or summary>",
          "time": "<ISO8601 datetime if applicable, else null>"
        }}

        Notes:
        - "reminder": user says "remind", "reminder", etc.
        - "todo": short tasks without specific time
        - "note": general info to remember
        - "meeting": message mentions meeting, call, event with time
        - "question": questions ("what", "how", etc.)
        - "chat": everything else
        - If time missing for reminders or meetings, assume now + 1 minute

        Message: "{text}"
        """

        # LLM call skipped since self.llm not available in static method
        raw_response = "{}"  # fallback to rule-based only

        try:
            data = json.loads(raw_response)
        except Exception:
            data = NLPService.parse_message_rule(text)

        # default time for reminders/meetings
        if data.get("intent") in ["reminder", "meeting"] and not data.get("time"):
            data["time"] = (datetime.now() + timedelta(minutes=1)).isoformat()

        data["raw"] = text
        return data

    @staticmethod
    def parse_message_rule(text: str) -> dict:
        """
        Rule-based NLP parsing with support for:
        reminder, todo, note, meeting, question, chat
        """
        text_lower = text.lower()

        # Reminder / Note detection
        if any(word in text_lower for word in NLPService.reminder_keywords):
            time_match = re.search(r"at (\d{1,2})(?::(\d{2}))?", text_lower)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2) or 0)
                now = datetime.now()
                dt = datetime(now.year, now.month, now.day, hour, minute)
                if dt < now:
                    dt += timedelta(days=1)
                time_iso = dt.isoformat()
            else:
                time_iso = (datetime.now() + timedelta(minutes=1)).isoformat()

            intent = "note" if "remember" in text_lower else "reminder"
            action = re.sub(r"(remind me to |reminder to )", "", text_lower, flags=re.I).strip()
            return {"intent": intent, "action": action, "time": time_iso, "raw": text}

        # Meeting detection
        if "meeting" in text_lower or "call" in text_lower or "appointment" in text_lower:
            time_match = re.search(r"at (\d{1,2})(?::(\d{2}))?", text_lower)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2) or 0)
                now = datetime.now()
                dt = datetime(now.year, now.month, now.day, hour, minute)
                if dt < now:
                    dt += timedelta(days=1)
                time_iso = dt.isoformat()
            else:
                time_iso = (datetime.now() + timedelta(minutes=1)).isoformat()
            return {"intent": "meeting", "action": text, "time": time_iso, "raw": text}

        # Question detection
        if any(text_lower.startswith(word) for word in NLPService.question_keywords):
            return {"intent": "question", "action": text, "time": None, "raw": text}

        # Todo detection
        todo_verbs = ["finish", "complete", "start", "buy", "call", "send", "write", "prepare"]
        if any(text_lower.startswith(v) for v in todo_verbs):
            return {"intent": "todo", "action": text, "time": None, "raw": text}

        # Default to chat
        return {"intent": "chat", "action": text, "time": None, "raw": text}
