from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.domain.ports import ChatHistoryPort
from app.db.database import db_manager
import asyncio
from datetime import datetime

class MongoChatHistory(ChatHistoryPort):
    def __init__(self, collection_name: str = "chat_history"):
        self.collection_name = collection_name
        self._db: AsyncIOMotorDatabase = None
    
    def _get_db(self):
        """Get the MongoDB database instance"""
        if not self._db and db_manager.mongodb_db:
            self._db = db_manager.mongodb_db
        return self._db
    
    def _run_async(self, coro):
        """Helper to run async operations in sync context"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(coro)
    
    async def _get_async(self, chat_id: str) -> List[str]:
        """Async version of get method"""
        db = self._get_db()
        if not db:
            return []
        
        collection = db[self.collection_name]
        
        # Find chat history for this chat_id, sorted by timestamp
        cursor = collection.find(
            {"chat_id": chat_id}, 
            {"_id": 0, "message": 1, "timestamp": 1}
        ).sort("timestamp", 1)
        
        messages = []
        async for doc in cursor:
            messages.append(doc["message"])
        
        return messages
    
    async def _append_async(self, chat_id: str, question: str, answer: str):
        """Async version of append method"""
        db = self._get_db()
        if not db:
            return
        
        collection = db[self.collection_name]
        
        # Store the question-answer pair
        await collection.insert_many([
            {
                "chat_id": chat_id,
                "message": f"User: {question}",
                "timestamp": datetime.utcnow(),
                "type": "question"
            },
            {
                "chat_id": chat_id,
                "message": f"Assistant: {answer}",
                "timestamp": datetime.utcnow(),
                "type": "answer"
            }
        ])
    
    async def _list_ids_async(self) -> List[str]:
        """Async version of list_ids method"""
        db = self._get_db()
        if not db:
            return []
        
        collection = db[self.collection_name]
        
        # Get distinct chat_ids
        chat_ids = await collection.distinct("chat_id")
        return chat_ids
    
    def get(self, chat_id: str) -> List[str]:
        """Get chat history for a given chat_id"""
        return self._run_async(self._get_async(chat_id))
    
    def append(self, chat_id: str, question: str, answer: str):
        """Add a question-answer pair to chat history"""
        self._run_async(self._append_async(chat_id, question, answer))
    
    def list_ids(self) -> List[str]:
        """List all chat IDs"""
        return self._run_async(self._list_ids_async())