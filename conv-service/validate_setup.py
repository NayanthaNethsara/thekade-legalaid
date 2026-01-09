"""
Comprehensive validation script for RAG system setup.
Tests all components: database, embeddings, storage, and indexing.

Usage:
    python validate_setup.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import logging
from app.core.config import settings
from app.storage.pgvector import PgVectorStore
from app.services.embeddings import EmbeddingClient
from app.services.llm import LLMClient

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def print_section(title):
    """Print a section header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_database_connection():
    """Test PostgreSQL connection and pgvector extension."""
    print_section("Testing Database Connection")
    
    try:
        store = PgVectorStore()
        with store.get_connection() as conn:
            with conn.cursor() as cur:
                # Test basic connection
                cur.execute("SELECT version()")
                version = cur.fetchone()
                print(f"✅ PostgreSQL connected: {version['version'][:50]}...")
                
                # Check pgvector extension
                cur.execute("SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')")
                row = cur.fetchone()
                if isinstance(row, dict):
                    has_vector = bool(row.get('exists') or list(row.values())[0])
                else:
                    has_vector = bool(row[0])
                if has_vector:
                    print("✅ pgvector extension is installed")
                else:
                    print("❌ pgvector extension NOT installed")
                    return False
                
                # Check tables exist
                tables = ['documents', 'document_chunks']
                for table in tables:
                    cur.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}')")
                    row = cur.fetchone()
                    if isinstance(row, dict):
                        exists = bool(row.get('exists') or list(row.values())[0])
                    else:
                        exists = bool(row[0])
                    if exists:
                        print(f"✅ Table '{table}' exists")
                    else:
                        print(f"❌ Table '{table}' NOT found")
                        return False
                
                # Check index exists
                cur.execute("""
                    SELECT indexname FROM pg_indexes 
                    WHERE tablename = 'document_chunks' 
                    AND indexname = 'document_chunks_embedding_idx'
                """)
                index = cur.fetchone()
                if index:
                    print(f"✅ Vector index exists")
                else:
                    print(f"⚠️  Warning: Vector index not found (may affect performance)")
                
                # Get stats
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT d.id) as total_documents,
                        COUNT(c.id) as total_chunks
                    FROM documents d
                    LEFT JOIN document_chunks c ON c.document_id = d.id
                """)
                stats = cur.fetchone()
                if isinstance(stats, dict):
                    docs = stats.get('total_documents', 0)
                    chunks = stats.get('total_chunks', 0)
                else:
                    docs, chunks = stats
                print(f"📊 Current stats: {docs} documents, {chunks} chunks")
                
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False


def test_embeddings():
    """Test embedding generation."""
    print_section("Testing Embedding Generation")
    
    try:
        client = EmbeddingClient()
        
        # Test single embedding
        test_text = "This is a test sentence for embedding generation."
        embedding = client.embed_text(test_text)
        
        print(f"✅ Generated embedding")
        print(f"   Dimension: {len(embedding)}")
        print(f"   Model: {client.model}")
        print(f"   First 5 values: {embedding[:5]}")
        
        # Verify dimension matches settings
        if len(embedding) == settings.VECTOR_DIM:
            print(f"✅ Embedding dimension matches VECTOR_DIM ({settings.VECTOR_DIM})")
        else:
            print(f"❌ Dimension mismatch: got {len(embedding)}, expected {settings.VECTOR_DIM}")
            return False
        
        # Test batch embeddings
        test_texts = [
            "First test sentence.",
            "Second test sentence.",
            "Third test sentence."
        ]
        embeddings = client.embed_texts(test_texts)
        
        if len(embeddings) == len(test_texts):
            print(f"✅ Batch embedding successful: {len(embeddings)} embeddings")
        else:
            print(f"❌ Batch embedding failed: expected {len(test_texts)}, got {len(embeddings)}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Embedding test failed: {e}")
        return False


def test_llm():
    """Test LLM generation."""
    print_section("Testing LLM Generation")
    
    try:
        client = LLMClient()
        
        # Test simple generation
        context_chunks = [
            {
                'text': 'The speed limit in urban areas is 50 km/h.',
                'id': 1,
                'chunk_index': 0,
                'document_id': 1,
                'document_metadata': {
                    'filename': 'road-traffic-act.pdf',
                    'file_type': 'pdf'
                },
                'distance': 0.1
            }
        ]
        
        question = "What is the speed limit in urban areas?"
        result = client.generate_answer(question, context_chunks)
        
        print(f"✅ LLM generation successful")
        print(f"   Question: {question}")
        print(f"   Answer: {result['answer'][:100]}...")
        print(f"   Citations: {len(result['citations'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ LLM test failed: {e}")
        return False


def test_vector_operations():
    """Test vector storage and retrieval."""
    print_section("Testing Vector Operations")
    
    try:
        store = PgVectorStore()
        embedder = EmbeddingClient()
        
        # Create a test document
        test_content = "This is a test document for validating vector operations in the RAG system."
        metadata = {
            "filename": "test_validation.txt",
            "mime_type": "text/plain",
            "test": True
        }
        
        print("Creating test document...")
        doc_id = store.upsert_document(
            source="validation-test",
            content=test_content,
            metadata=metadata
        )
        print(f"✅ Created test document: ID={doc_id}")
        
        # Create test chunks with embeddings
        test_chunks = [
            {
                'text': 'This is a test document for validating vector operations.',
                'embedding': embedder.embed_text('This is a test document for validating vector operations.'),
                'metadata': {
                    'chunk_index': 0,
                    'test': True
                }
            },
            {
                'text': 'The RAG system uses embeddings for semantic search.',
                'embedding': embedder.embed_text('The RAG system uses embeddings for semantic search.'),
                'metadata': {
                    'chunk_index': 1,
                    'test': True
                }
            }
        ]
        
        print(f"Inserting {len(test_chunks)} test chunks...")
        store.upsert_chunks(doc_id, test_chunks)
        print(f"✅ Inserted test chunks")
        
        # Test similarity search
        query = "How does the RAG system work?"
        query_embedding = embedder.embed_text(query)
        
        print(f"Testing similarity search: '{query}'")
        results = store.query_similar_chunks(query_embedding, top_k=5)
        
        if results:
            print(f"✅ Similarity search successful: {len(results)} results")
            for i, result in enumerate(results[:3], 1):
                print(f"   [{i}] Distance: {result['distance']:.3f}")
                print(f"       Text: {result['text'][:50]}...")
        else:
            print("⚠️  No results found (this might be expected if database is empty)")
        
        # Clean up test data
        print("Cleaning up test data...")
        with store.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
                conn.commit()
        print("✅ Test data cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Vector operations test failed: {e}")
        return False


def test_configuration():
    """Test configuration values."""
    print_section("Configuration Check")
    
    config_items = [
        ("DATABASE_URL", settings.DATABASE_URL, True),
        ("DIRECT_URL", settings.DIRECT_URL, True),
        ("GEMINI_API_KEY", settings.GEMINI_API_KEY, True),
        ("GEMINI_EMBEDDING_MODEL", settings.GEMINI_EMBEDDING_MODEL, False),
        ("VECTOR_DIM", settings.VECTOR_DIM, False),
        ("CHUNK_SIZE", settings.CHUNK_SIZE, False),
        ("CHUNK_OVERLAP", settings.CHUNK_OVERLAP, False),
        ("RAG_TOP_K", settings.RAG_TOP_K, False),
        ("KAFKA_BROKER_URL", settings.KAFKA_BROKER_URL, False),
        ("AZURE_STORAGE_CONNECTION_STRING", settings.AZURE_STORAGE_CONNECTION_STRING, False),
    ]
    
    all_good = True
    for name, value, required in config_items:
        if value:
            if name in ["DATABASE_URL", "DIRECT_URL", "GEMINI_API_KEY"]:
                # Mask sensitive values
                display = f"{str(value)[:20]}..."
            else:
                display = value
            print(f"✅ {name}: {display}")
        else:
            if required:
                print(f"❌ {name}: NOT SET (required)")
                all_good = False
            else:
                print(f"⚠️  {name}: NOT SET (optional)")
    
    return all_good


def main():
    """Run all validation tests."""
    print("\n" + "=" * 60)
    print("  RAG SYSTEM VALIDATION")
    print("=" * 60)
    print(f"  Environment: {settings.DATABASE_URL.split('@')[1].split('/')[0] if '@' in settings.DATABASE_URL else 'unknown'}")
    print(f"  Embedding model: {settings.GEMINI_EMBEDDING_MODEL}")
    print(f"  Vector dimension: {settings.VECTOR_DIM}")
    print("=" * 60)
    
    results = {
        "Configuration": test_configuration(),
        "Database Connection": test_database_connection(),
        "Embedding Generation": test_embeddings(),
        "LLM Generation": test_llm(),
        "Vector Operations": test_vector_operations(),
    }
    
    # Print summary
    print_section("Validation Summary")
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:.<40} {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("Your RAG system is ready to use.")
        print("\nNext steps:")
        print("  1. Index documents: python bulk_index.py <corpus-folder>")
        print("  2. Start API server: .\\start-rag-api.ps1")
        print("  3. Test queries: python test_rag_api.py")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("Please review the errors above and fix configuration issues.")
        print("\nCommon issues:")
        print("  • Check .env file exists and has correct values")
        print("  • Verify PostgreSQL has pgvector extension enabled")
        print("  • Ensure Gemini API key is valid")
        print("  • Run: python run_rag_setup.py (to create schema)")
    print("=" * 60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
