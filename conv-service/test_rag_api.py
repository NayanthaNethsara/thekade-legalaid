"""
Simple test script for the RAG API.
"""
import requests
import json

# API endpoint
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint."""
    response = requests.get(f"{BASE_URL}/")
    print("Health Check:")
    print(json.dumps(response.json(), indent=2))
    print()

def test_stats():
    """Test stats endpoint."""
    response = requests.get(f"{BASE_URL}/api/v1/rag/stats")
    print("RAG Stats:")
    print(json.dumps(response.json(), indent=2))
    print()

def test_query(question: str):
    """Test RAG query endpoint."""
    payload = {
        "question": question,
        "top_k": 3
    }
    
    print(f"Question: {question}")
    print("Querying RAG system...")
    
    response = requests.post(
        f"{BASE_URL}/api/v1/rag/query",
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        print("\nAnswer:")
        print(result["answer"])
        print(f"\nCitations ({len(result['citations'])} sources):")
        for citation in result["citations"]:
            print(f"  [{citation['source_number']}] {citation['filename']} (chunk {citation['chunk_index']}, distance: {citation['distance']:.3f})")
        print("\nMetadata:")
        print(json.dumps(result["metadata"], indent=2))
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    print("="*80)
    print("RAG API Test")
    print("="*80)
    print()
    
    # Test health check
    test_health()
    
    # Test stats
    test_stats()
    
    # Test queries
    questions = [
        "According to the Motor Traffic Act, what is the penalty for driving a motor vehicle without proper registration?",
        "Under the Code of Criminal Procedure, in what situations can a police officer arrest a person without a warrant?",
        "If a driver causes a serious road accident, how do the Motor Traffic Act and the Code of Criminal Procedure apply together in handling the case?",
        "Is community service mentioned as a possible punishment in the provided laws? If yes, under which section; if not, state that it is not mentioned."
    ]
    
    for question in questions:
        test_query(question)
