"""
Interactive RAG Chat Test - Ask questions about Sri Lankan law!
"""
import requests
import json
from typing import Optional

BASE_URL = "http://localhost:8000"

def print_separator():
    print("\n" + "="*80 + "\n")

def check_api_health():
    """Check if the RAG API is running."""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/rag/health", timeout=2)
        if response.status_code == 200:
            print("✅ RAG API is running and healthy!")
            return True
        else:
            print("❌ RAG API returned an error")
            return False
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to RAG API. Make sure it's running:")
        print("   cd conv-service")
        print("   .\\start-rag-api.ps1")
        return False

def get_stats():
    """Get system statistics."""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/rag/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"📊 System Stats:")
            print(f"   Documents: {stats['total_documents']}")
            print(f"   Chunks: {stats['total_chunks']}")
            print(f"   Model: {stats['embedding_model']}")
            print(f"   Vector Dimension: {stats['vector_dim']}")
            return stats
    except Exception as e:
        print(f"Could not fetch stats: {e}")
    return None

def ask_question(question: str, top_k: int = 5) -> Optional[dict]:
    """Ask a question to the RAG system."""
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/rag/query",
            json={"question": question, "top_k": top_k},
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return None
    except requests.exceptions.Timeout:
        print("⏱️ Request timed out. The question might be too complex.")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def display_result(result: dict):
    """Display the RAG result in a nice format."""
    print("\n📝 ANSWER:")
    print("-" * 80)
    print(result['answer'])
    print("-" * 80)
    
    if result['citations']:
        print(f"\n📚 SOURCES ({len(result['citations'])} citations):")
        for i, citation in enumerate(result['citations'], 1):
            print(f"\n[{i}] {citation['filename']}")
            print(f"    Chunk: {citation['chunk_index']} | Similarity: {(1 - citation['distance']) * 100:.1f}%")
            print(f"    Excerpt: {citation['excerpt'][:150]}...")
    
    if result['metadata']:
        meta = result['metadata']
        print(f"\n📊 METADATA:")
        print(f"    Chunks retrieved: {meta.get('chunks_retrieved', 'N/A')}")
        print(f"    Documents referenced: {meta.get('documents_referenced', 'N/A')}")
        if 'avg_distance' in meta:
            print(f"    Average similarity: {(1 - meta['avg_distance']) * 100:.1f}%")

def interactive_mode():
    """Run in interactive mode."""
    print("\n🤖 Interactive RAG Chat")
    print("="*80)
    print("Ask questions about Sri Lankan law (Criminal Procedure & Motor Traffic)")
    print("Type 'quit' or 'exit' to stop")
    print("Type 'stats' to see system statistics")
    print("="*80)
    
    while True:
        print()
        question = input("💬 Your question: ").strip()
        
        if not question:
            continue
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("\n👋 Thanks for using the RAG chatbot!")
            break
        
        if question.lower() == 'stats':
            print_separator()
            get_stats()
            print_separator()
            continue
        
        print("\n🔍 Searching legal documents...")
        result = ask_question(question)
        
        if result:
            print_separator()
            display_result(result)
            print_separator()

def demo_mode():
    """Run pre-configured demo questions."""
    print("\n🎬 Demo Mode - Running Sample Questions")
    print("="*80)
    
    demo_questions = [
        "What are the penalties for drunk driving in Sri Lanka?",
        "Can police arrest someone without a warrant?",
        "What is the speed limit in urban areas?",
        "What documents must I carry while driving?",
    ]
    
    for i, question in enumerate(demo_questions, 1):
        print(f"\n📌 Question {i}/{len(demo_questions)}: {question}")
        print("🔍 Searching...")
        
        result = ask_question(question)
        if result:
            print_separator()
            display_result(result)
            print_separator()
            
            if i < len(demo_questions):
                input("\nPress Enter for next question...")

def main():
    print("\n" + "="*80)
    print(" 🇱🇰 Sri Lankan Legal RAG Chatbot - Interactive Tester")
    print("="*80)
    
    # Check API health
    if not check_api_health():
        return
    
    print_separator()
    get_stats()
    print_separator()
    
    # Ask user for mode
    print("\nChoose a mode:")
    print("  1. Interactive Mode (ask your own questions)")
    print("  2. Demo Mode (run sample questions)")
    print("  3. Quick Test (single question)")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == "1":
        interactive_mode()
    elif choice == "2":
        demo_mode()
    elif choice == "3":
        question = input("\n💬 Your question: ").strip()
        if question:
            result = ask_question(question)
            if result:
                print_separator()
                display_result(result)
                print_separator()
    else:
        print("Invalid choice. Running demo mode...")
        demo_mode()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted. Goodbye!")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
