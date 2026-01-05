"""
Bulk indexing CLI for RAG system.
Processes documents from a directory and indexes them into the vector database.
"""
import argparse
import logging
import sys
from pathlib import Path
from typing import List, Optional
from tqdm import tqdm

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.utils.text_extraction import extract_text, normalize_text
from app.utils.chunking import TextChunker
from app.services.embeddings import EmbeddingClient
from app.storage.pgvector import PgVectorStore
from app.utils.azure_storage import AzureBlobUploader
from app.utils.kafka_emitter import IndexingEventEmitter

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_documents_from_directory(directory: Path) -> List[Path]:
    """
    Recursively find all supported documents in a directory.
    
    Args:
        directory: Path to directory to scan
        
    Returns:
        List of document paths
    """
    supported_extensions = {'.pdf', '.docx', '.doc', '.txt'}
    documents = []
    
    for ext in supported_extensions:
        documents.extend(directory.rglob(f'*{ext}'))
    
    logger.info(f"Found {len(documents)} documents in {directory}")
    return sorted(documents)


def index_document(
    file_path: Path,
    chunker: TextChunker,
    embedder: EmbeddingClient,
    store: PgVectorStore,
    blob_uploader: Optional[AzureBlobUploader] = None,
    event_emitter: Optional[IndexingEventEmitter] = None,
    source: str = "admin-bulk"
) -> dict:
    """
    Index a single document: extract, chunk, embed, and store.
    Optionally uploads to Azure Blob and emits Kafka event.
    
    Args:
        file_path: Path to document
        chunker: Text chunker instance
        embedder: Embedding client instance
        store: Vector store instance
        blob_uploader: Optional Azure Blob uploader
        event_emitter: Optional Kafka event emitter
        source: Source identifier for the document
        
    Returns:
        Dict with indexing stats
    """
    logger.info(f"Processing: {file_path.name}")
    
    blob_url = None
    
    try:
        # 1. Upload to Azure Blob (if uploader provided)
        if blob_uploader:
            try:
                blob_url = blob_uploader.upload_file(file_path)
                logger.info(f"Uploaded to blob: {blob_url}")
            except Exception as e:
                logger.warning(f"Failed to upload to blob (continuing anyway): {e}")
        
        # 2. Extract text
        raw_text = extract_text(file_path)
        text = normalize_text(raw_text)
        
        if not text.strip():
            logger.warning(f"No text extracted from {file_path.name}, skipping")
            return {"status": "skipped", "reason": "empty_text"}
        
        # 3. Create document metadata
        doc_metadata = {
            "filename": file_path.name,
            "filepath": str(file_path),
            "file_type": file_path.suffix.lower(),
            "char_count": len(text),
            "trusted": True  # Mark as trusted for admin-bulk uploads
        }
        
        # 4. Chunk text
        chunk_metadata = {
            "source_file": file_path.name
        }
        chunks = chunker.chunk_text(text, metadata=chunk_metadata)
        
        if not chunks:
            logger.warning(f"No chunks created from {file_path.name}, skipping")
            return {"status": "skipped", "reason": "no_chunks"}
        
        # 5. Generate embeddings
        logger.info(f"Generating embeddings for {len(chunks)} chunks...")
        chunk_texts = [chunk['text'] for chunk in chunks]
        embeddings = embedder.embed_texts(chunk_texts)
        
        # Attach embeddings to chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk['embedding'] = embedding
        
        # 6. Store in database
        doc_id = store.upsert_document(
            source=source,
            content=text,
            metadata=doc_metadata,
            blob_url=blob_url
        )
        
        chunk_count = store.upsert_chunks(doc_id, chunks)
        
        logger.info(f"✅ Indexed {file_path.name}: document_id={doc_id}, chunks={chunk_count}")
        
        # 7. Emit Kafka event (if emitter provided)
        if event_emitter:
            try:
                event_emitter.emit_indexing_event(
                    file_path=str(file_path),
                    blob_url=blob_url,
                    document_id=doc_id,
                    metadata={
                        "filename": file_path.name,
                        "chunk_count": chunk_count,
                        "char_count": len(text),
                        "source": source,
                        "trusted": True
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to emit Kafka event (continuing anyway): {e}")
        
        return {
            "status": "success",
            "document_id": doc_id,
            "chunk_count": chunk_count,
            "char_count": len(text)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to index {file_path.name}: {e}")
        return {"status": "error", "error": str(e)}


def main():
    """Main entry point for bulk indexing."""
    parser = argparse.ArgumentParser(
        description="Bulk index documents into RAG vector database"
    )
    parser.add_argument(
        "directory",
        type=Path,
        help="Directory containing documents to index"
    )
    parser.add_argument(
        "--source",
        default="admin-bulk",
        help="Source identifier for documents (default: admin-bulk)"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=settings.CHUNK_SIZE,
        help=f"Chunk size in tokens (default: {settings.CHUNK_SIZE})"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=settings.CHUNK_OVERLAP,
        help=f"Chunk overlap in tokens (default: {settings.CHUNK_OVERLAP})"
    )
    parser.add_argument(
        "--upload-to-blob",
        action="store_true",
        help="Upload documents to Azure Blob Storage before indexing"
    )
    parser.add_argument(
        "--emit-kafka-events",
        action="store_true",
        help="Emit indexing events to Kafka topic"
    )
    
    args = parser.parse_args()
    
    # Validate directory
    if not args.directory.exists():
        logger.error(f"Directory not found: {args.directory}")
        sys.exit(1)
    
    if not args.directory.is_dir():
        logger.error(f"Path is not a directory: {args.directory}")
        sys.exit(1)
    
    # Initialize components
    logger.info("Initializing RAG components...")
    chunker = TextChunker(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap
    )
    embedder = EmbeddingClient()
    store = PgVectorStore()
    
    # Initialize optional Azure Blob uploader
    blob_uploader = None
    if args.upload_to_blob:
        try:
            blob_uploader = AzureBlobUploader()
            logger.info("Azure Blob uploader initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Azure Blob uploader: {e}")
    
    # Initialize optional Kafka event emitter
    event_emitter = None
    if args.emit_kafka_events:
        try:
            event_emitter = IndexingEventEmitter()
            logger.info("Kafka event emitter initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Kafka event emitter: {e}")
    
    # Get documents
    documents = get_documents_from_directory(args.directory)
    
    if not documents:
        logger.warning(f"No supported documents found in {args.directory}")
        sys.exit(0)
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Starting bulk indexing:")
    logger.info(f"  Directory: {args.directory}")
    logger.info(f"  Documents: {len(documents)}")
    logger.info(f"  Source: {args.source}")
    logger.info(f"  Chunk size: {args.chunk_size} tokens")
    logger.info(f"  Chunk overlap: {args.chunk_overlap} tokens")
    logger.info(f"  Upload to blob: {args.upload_to_blob}")
    logger.info(f"  Emit Kafka events: {args.emit_kafka_events}")
    logger.info(f"{'='*60}\n")
    
    # Index all documents
    results = []
    for doc_path in tqdm(documents, desc="Indexing documents"):
        result = index_document(
            doc_path,
            chunker=chunker,
            embedder=embedder,
            store=store,
            blob_uploader=blob_uploader,
            event_emitter=event_emitter,
            source=args.source
        )
        results.append({
            "file": doc_path.name,
            **result
        })
    
    # Cleanup
    if event_emitter:
        event_emitter.close()
    
    # Summary
    success_count = sum(1 for r in results if r['status'] == 'success')
    error_count = sum(1 for r in results if r['status'] == 'error')
    skipped_count = sum(1 for r in results if r['status'] == 'skipped')
    
    total_chunks = sum(r.get('chunk_count', 0) for r in results)
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Indexing complete!")
    logger.info(f"  ✅ Success: {success_count}")
    logger.info(f"  ❌ Errors: {error_count}")
    logger.info(f"  ⏭️  Skipped: {skipped_count}")
    logger.info(f"  📦 Total chunks: {total_chunks}")
    logger.info(f"\nDatabase stats:")
    logger.info(f"  Documents: {store.get_document_count()}")
    logger.info(f"  Chunks: {store.get_chunk_count()}")
    logger.info(f"{'='*60}\n")
    
    # Print errors if any
    if error_count > 0:
        logger.error("\nErrors encountered:")
        for result in results:
            if result['status'] == 'error':
                logger.error(f"  - {result['file']}: {result['error']}")


if __name__ == "__main__":
    main()
