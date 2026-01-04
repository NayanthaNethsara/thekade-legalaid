"""
Run RAG schema setup directly (bypasses Alembic migration issues)
"""
import psycopg2
from app.core.config import settings

sql_file = "setup_rag_schema.sql"

print("Reading SQL file...")
with open(sql_file, 'r') as f:
    sql = f.read()

print(f"Connecting to database: {settings.DIRECT_URL.split('@')[1].split('/')[0]}...")
# Use DIRECT_URL if available (for Supabase), otherwise DATABASE_URL
db_url = getattr(settings, 'DIRECT_URL', settings.DATABASE_URL)
# Remove unsupported query params
db_url = db_url.split('?')[0] if '?' in db_url else db_url
conn = psycopg2.connect(db_url)
conn.autocommit = True
cursor = conn.cursor()

print("Executing RAG schema setup...")
try:
    cursor.execute(sql)
    print("✅ RAG schema setup completed successfully!")
    
    # Fetch verification results
    cursor.execute("""
        SELECT 
            'documents' as table_name,
            EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') as exists
        UNION ALL
        SELECT 
            'document_chunks',
            EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks')
        UNION ALL
        SELECT 
            'pgvector extension',
            EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')
    """)
    
    print("\nVerification:")
    for row in cursor.fetchall():
        status = "✅" if row[1] else "❌"
        print(f"  {status} {row[0]}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    raise
finally:
    cursor.close()
    conn.close()

print("\n✅ Phase 1 database setup complete!")
print("You can now proceed to Phase 2: Admin Pre-feed Tooling")
