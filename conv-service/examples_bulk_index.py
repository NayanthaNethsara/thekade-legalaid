"""
Example script demonstrating Phase 2 bulk indexing.
This shows how to use the bulk_index.py tool for different scenarios.
"""

# Example 1: Basic local indexing (no cloud services)
# Good for development/testing
print("Example 1: Basic local indexing")
print("Command:")
print('  python bulk_index.py f:\\legal-corpus')
print()

# Example 2: Upload to Azure Blob for backup
# Good for production with document backup requirements
print("Example 2: With Azure Blob backup")
print("Command:")
print('  python bulk_index.py f:\\legal-corpus --upload-to-blob')
print()

# Example 3: Emit NATS events for monitoring
# Good for tracking indexing operations
print("Example 3: With NATS event tracking")
print("Command:")
print('  python bulk_index.py f:\\legal-corpus --emit-nats-events')
print()

# Example 4: Full production setup
# Azure backup + NATS tracking + custom source label
print("Example 4: Full production setup")
print("Command:")
print('  python bulk_index.py f:\\legal-corpus \\')
print('    --source "sri-lanka-legal-corpus-v1" \\')
print('    --chunk-size 1000 \\')
print('    --chunk-overlap 200 \\')
print('    --upload-to-blob \\')
print('    --emit-nats-events')
print()

# Example 5: Custom chunking for specific document types
# Smaller chunks for dense legal text
print("Example 5: Custom chunking for dense legal text")
print("Command:")
print('  python bulk_index.py f:\\legal-corpus\\statutes \\')
print('    --chunk-size 500 \\')
print('    --chunk-overlap 100')
print()

# Example 6: Processing specific subdirectories
print("Example 6: Processing by document category")
print("Commands:")
print('  python bulk_index.py f:\\legal-corpus\\road-traffic --source "road-traffic-laws"')
print('  python bulk_index.py f:\\legal-corpus\\criminal --source "criminal-law"')
print('  python bulk_index.py f:\\legal-corpus\\civil --source "civil-law"')
print()

print("=" * 60)
print("SETUP CHECKLIST:")
print("=" * 60)
print("1. ✓ Database: PostgreSQL with pgvector extension")
print("2. ✓ Schema: Run 'alembic upgrade head'")
print("3. ✓ Environment: Configure .env with OPENAI_API_KEY")
print("4. ✓ Dependencies: Run 'pip install -r requirements.txt'")
print("5. ✓ Corpus: Prepare directory with trusted PDFs/DOCX/TXT")
print()
print("Then run one of the examples above!")
