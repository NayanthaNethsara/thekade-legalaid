class MeetingService:
    @staticmethod
    async def create_meeting(user_id: str, text: str, time: str):
        print(f"[Meeting] {user_id} -> {text} at {time}")
