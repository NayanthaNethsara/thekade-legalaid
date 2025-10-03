from typing import List
import pymongo
from app.domain.ports import ChatHistoryPort
from app.core.config import settings
from datetime import datetime
import threading

class MongoChatHistory(ChatHistoryPort):
    _client = None
    _db = None
    _lock = threading.Lock()
    
    def __init__(self, collection_name: str = "chat_history"):
        self.collection_name = collection_name
        self._init_connection()
    
    def _init_connection(self):
        """Initialize MongoDB connection using pymongo (sync)"""
        with self._lock:
            if MongoChatHistory._client is None:
                try:
                    MongoChatHistory._client = pymongo.MongoClient(
                        settings.MONGODB_URL,
                        serverSelectionTimeoutMS=5000,  # 5 second timeout
                        connectTimeoutMS=5000,
                        socketTimeoutMS=5000
                    )
                    MongoChatHistory._db = MongoChatHistory._client[settings.MONGODB_DB_NAME]
                    # Test connection
                    MongoChatHistory._client.admin.command('ping')
                    print(f"✅ Connected to MongoDB Atlas: {settings.MONGODB_DB_NAME}")
                except Exception as e:
                    print(f"❌ Failed to connect to MongoDB Atlas: {e}")
                    # Fallback to empty implementation
                    MongoChatHistory._client = None
                    MongoChatHistory._db = None
    
    def _get_collection(self):
        """Get the chat history collection"""
        if self._db is not None:
            return self._db[self.collection_name]
        return None
    
    def get(self, chat_id: str) -> List[str]:
        """Get chat history for a given chat_id"""
        try:
            collection = self._get_collection()
            if collection is None:
                return []
            
            # Find chat history for this chat_id, sorted by timestamp
            cursor = collection.find(
                {"chat_id": chat_id}, 
                {"_id": 0, "message": 1, "timestamp": 1}
            ).sort("timestamp", 1)
            
            messages = [doc["message"] for doc in cursor]
            return messages
            
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return []
    
    def append(self, chat_id: str, question: str, answer: str):
        """Add a question-answer pair to chat history"""
        try:
            collection = self._get_collection()
            if collection is None:
                return
            
            # Store the question-answer pair
            documents = [
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
            ]
            
            collection.insert_many(documents)
            print(f"✅ Chat history saved to Atlas for chat_id: {chat_id}")
            
        except Exception as e:
            print(f"Error saving chat history: {e}")
    
    def list_ids(self) -> List[str]:
        """List all chat IDs"""
        try:
            collection = self._get_collection()
            if collection is None:
                return []
            
            # Get distinct chat_ids
            chat_ids = collection.distinct("chat_id")
            return list(chat_ids)
            
        except Exception as e:
            print(f"Error listing chat IDs: {e}")
            return []