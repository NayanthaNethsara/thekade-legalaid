#!/usr/bin/env python3
"""
Debug script to test the chat functionality directly
"""
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

# Now test the components
if __name__ == "__main__":
    try:
        print("🔍 Testing chat components...")
        
        # Test 1: Import the main components
        print("1. Testing imports...")
        from app.adapters.chat.inmem_history import InMemChatHistory
        from app.adapters.llm.gemini_llm import GeminiLLM
        from app.adapters.rag.faiss_retriever import FaissRetriever
        from app.services.rag.qa_service import QAService
        print("✅ All imports successful")
        
        # Test 2: Initialize components
        print("2. Testing component initialization...")
        history = InMemChatHistory()
        llm = GeminiLLM()
        retriever = FaissRetriever()
        print("✅ Components initialized")
        
        # Test 3: Test retriever (this is likely where the error is)
        print("3. Testing retriever...")
        docs = retriever.topk("What are driving license requirements?", 3)
        print(f"✅ Retrieved {len(docs)} documents")
        print(f"First doc preview: {docs[0][:200] if docs else 'No docs'}...")
        
        # Test 4: Test QA Service
        print("4. Testing QA service...")
        qa = QAService(retriever=retriever, llm=llm, history=history)
        result = qa.answer("test_chat", "What are driving license requirements?")
        print(f"✅ QA service response: {result['answer'][:100]}...")
        
        print("🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Error occurred: {e}")
        import traceback
        traceback.print_exc()