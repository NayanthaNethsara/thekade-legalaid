#!/usr/bin/env python3
"""
Test the complete chat API with MongoDB Atlas
"""
import requests
import json
import time

def test_chat_endpoint():
    """Test the chat API endpoint"""
    url = "http://127.0.0.1:8000/api/v1/chatbot/chat"
    
    payload = {
        "chat_id": "frontend_test_chat",
        "query": "What are the minimum age requirements for a driving licence for heavy motor vehicles?"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("🔍 Testing chat API endpoint...")
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        start_time = time.time()
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        end_time = time.time()
        
        print(f"⏱️  Response time: {end_time - start_time:.2f} seconds")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat API working!")
            print(f"🤖 Response: {data.get('answer', 'No answer')[:200]}...")
            print(f"📝 Chat ID: {data.get('chat_id')}")
            print(f"📄 Retrieved chunks: {len(data.get('retrieved_chunks', []))}")
            return True
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Backend server is not running on port 8000")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout Error: Server took too long to respond")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Make sure backend server is running first!")
    print("To start: cd F:\\thekade-legalaid\\backend; .\\venv\\Scripts\\python.exe start_server.py")
    print()
    test_chat_endpoint()