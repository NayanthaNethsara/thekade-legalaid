class NoteService:
    @staticmethod
    async def create_note(user_id: str, text: str):
        print(f"[Note] {user_id} -> {text}")
