"""
Fix vector dimension in database from 1536 to 768.
This script alters the document_chunks table to use vector(768) to match the Gemini embedding dimension.

Usage:
    python fix_vector_dimension.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import psycopg
from app.core.config import settings

print("=" * 60)
print("  Fixing Vector Dimension: 1536 → 768")
print("=" * 60)
print()

# Get database URL
db_url = getattr(settings, 'DIRECT_URL', settings.DATABASE_URL)
# Remove query parameters if present
db_url = db_url.split('?')[0] if '?' in db_url else db_url

print(f"Connecting to database: {db_url.split('@')[1].split('/')[0]}...")

try:
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # Check current dimension
            print("\n1. Checking current vector dimension...")
            cur.execute("""
                SELECT 
                    column_name, 
                    data_type, 
                    udt_name
                FROM information_schema.columns 
                WHERE table_name = 'document_chunks' 
                AND column_name = 'embedding'
            """)
            col_info = cur.fetchone()
            if col_info:
                print(f"   Current: {col_info}")
            
            # Check if there's any data
            cur.execute("SELECT COUNT(*) FROM document_chunks")
            chunk_count = cur.fetchone()[0]
            print(f"\n2. Found {chunk_count} existing chunks")
            
            if chunk_count > 0:
                print("   ⚠️  Warning: Existing chunks will be deleted")
                response = input("   Continue? (yes/no): ")
                if response.lower() != 'yes':
                    print("\n❌ Aborted by user")
                    sys.exit(1)
                
                print("   Deleting existing chunks...")
                cur.execute("DELETE FROM document_chunks")
                print(f"   ✅ Deleted {chunk_count} chunks")
            
            # Alter the column type
            print("\n3. Altering embedding column to vector(768)...")
            cur.execute("ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768)")
            print("   ✅ Column altered")
            
            # Drop and recreate the index
            print("\n4. Recreating vector index...")
            cur.execute("DROP INDEX IF EXISTS document_chunks_embedding_idx")
            cur.execute("""
                CREATE INDEX document_chunks_embedding_idx
                ON document_chunks
                USING ivfflat (embedding vector_l2_ops)
                WITH (lists = 100)
            """)
            print("   ✅ Index recreated")
            
            # Analyze table
            print("\n5. Analyzing table...")
            cur.execute("ANALYZE document_chunks")
            print("   ✅ Table analyzed")
            
            # Commit changes
            conn.commit()
    
    print("\n" + "=" * 60)
    print("✅ Vector dimension fix complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Run validation: python validate_setup.py")
    print("  2. Index documents: python bulk_index.py <corpus-folder>")
    print("  3. Start API: .\\start-rag-api.ps1")
    print()
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)
