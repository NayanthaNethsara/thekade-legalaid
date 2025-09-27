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

def test_mongo_atlas():
    """Test MongoDB Atlas chat history"""
    try:
        print("🔍 Testing MongoDB Atlas connection...")
        
        from app.adapters.chat.mongo_history import MongoChatHistory
        
        history = MongoChatHistory()
        
        # Test storing chat history
        print("📝 Testing chat history storage...")
        chat_id = "test_chat_atlas_123"
        question = "What are driving license requirements?"
        answer = "You need to be at least 18 years old and pass both written and practical tests."
        
        history.append(chat_id, question, answer)
        
        # Test retrieving chat history
        print("📖 Testing chat history retrieval...")
        retrieved = history.get(chat_id)
        print(f"✅ Retrieved {len(retrieved)} messages")
        for i, msg in enumerate(retrieved):
            print(f"  {i+1}. {msg}")
        
        # Test listing chat IDs
        print("📋 Testing chat ID listing...")
        chat_ids = history.list_ids()
        print(f"✅ Found {len(chat_ids)} chat IDs: {chat_ids}")
        
        print("🎉 MongoDB Atlas test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_mongo_atlas()