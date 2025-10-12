class BookingService:
    @staticmethod
    async def process_book(user_id: str, text: str, time: str):
        print(f"[Book] {user_id} -> {text} at {time}")
