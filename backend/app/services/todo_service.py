class TodoService:
    @staticmethod
    async def create_todo(user_id: str, text: str):
        print(f"[Todo] {user_id} -> {text}")
