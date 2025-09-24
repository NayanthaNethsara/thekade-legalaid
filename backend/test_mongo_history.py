#!/usr/bin/env python3
"""
Test MongoDB Atlas chat history functionality
"""
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

async def test_mongo_chat_history():
    """Test MongoDB chat history functionality"""
    try:
        print("🔍 Testing MongoDB Atlas chat history...")
        
        # Initialize database connection
        from app.db.database import db_manager
        await db_manager.connect_mongodb()
        
        # Test chat history
        from app.adapters.chat.mongo_history import MongoChatHistory
        
        history = MongoChatHistory()
        
        # Test storing chat history
        print("📝 Testing chat history storage...")
        chat_id = "test_chat_atlas"
        question = "What are driving license requirements?"
        answer = "You need to be at least 18 years old and pass both written and practical tests."
        
        history.append(chat_id, question, answer)
        print("✅ Chat history stored successfully")
        
        # Test retrieving chat history
        print("📖 Testing chat history retrieval...")
        retrieved = history.get(chat_id)
        print(f"✅ Retrieved {len(retrieved)} messages")
        for msg in retrieved:
            print(f"  - {msg}")
        
        # Test listing chat IDs
        print("📋 Testing chat ID listing...")
        chat_ids = history.list_ids()
        print(f"✅ Found {len(chat_ids)} chat IDs: {chat_ids}")
        
        # Cleanup
        await db_manager.disconnect_mongodb()
        print("🎉 MongoDB Atlas chat history test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_mongo_chat_history())