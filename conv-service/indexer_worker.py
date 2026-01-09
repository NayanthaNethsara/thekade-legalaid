"""
Indexer worker that consumes Kafka indexing events.
This script runs as a standalone process to index documents into the vector database.

Usage:
    python indexer_worker.py
"""
import asyncio
import logging
import signal
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.kafka import KafkaService
from app.services.indexer_service import IndexerService
from app.core.config import settings
from app.utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)
logger.setLevel(logging.INFO)

# Global flag for graceful shutdown
should_stop = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global should_stop
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    should_stop = True


async def consume_indexing_events():
    """
    Main worker loop that consumes indexing events from Kafka.
    """
    global should_stop
    
    logger.info("Starting indexer worker...")
    logger.info(f"Kafka broker: {settings.KAFKA_BROKER_URL}")
    logger.info(f"Consuming from topic: {settings.KAFKA_TOPIC_INDEXING_TRUSTED}")
    
    # Initialize services
    kafka_service = KafkaService()
    indexer_service = IndexerService()
    
    # Stats tracking
    processed_count = 0
    success_count = 0
    error_count = 0
    
    try:
        # Start consuming messages
        async for message in kafka_service.consume_messages(settings.KAFKA_TOPIC_INDEXING_TRUSTED):
            if should_stop:
                logger.info("Stop signal received, breaking consumer loop...")
                break
            
            processed_count += 1
            logger.info(f"[{processed_count}] Received indexing event: {message.get('metadata', {}).get('filename', 'unknown')}")
            
            try:
                # Process the indexing event
                result = await indexer_service.process_indexing_event(message)
                
                if result.get("status") == "success":
                    success_count += 1
                    logger.info(
                        f"✅ Successfully indexed document {result.get('document_id')}: "
                        f"{result.get('filename')} ({result.get('chunks_created')} chunks)"
                    )
                else:
                    error_count += 1
                    logger.error(
                        f"❌ Failed to index document: {result.get('message', 'Unknown error')}"
                    )
                
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Error processing indexing event: {e}", exc_info=True)
            
            # Log stats periodically
            if processed_count % 10 == 0:
                logger.info(
                    f"📊 Stats: Processed={processed_count}, Success={success_count}, "
                    f"Errors={error_count}"
                )
    
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received, shutting down...")
    
    except Exception as e:
        logger.error(f"Fatal error in consumer loop: {e}", exc_info=True)
        raise
    
    finally:
        # Log final stats
        logger.info("=" * 60)
        logger.info("Indexer worker shutdown complete")
        logger.info(f"Final stats:")
        logger.info(f"  Total processed: {processed_count}")
        logger.info(f"  Successful: {success_count}")
        logger.info(f"  Errors: {error_count}")
        logger.info("=" * 60)


async def main():
    """Main entry point."""
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("=" * 60)
    logger.info("RAG Indexer Worker")
    logger.info("=" * 60)
    logger.info(f"Environment: {settings.DATABASE_URL.split('@')[1].split('/')[0]}")
    logger.info(f"Embedding model: {settings.GEMINI_EMBEDDING_MODEL}")
    logger.info(f"Vector dimension: {settings.VECTOR_DIM}")
    logger.info(f"Chunk size: {settings.CHUNK_SIZE} tokens")
    logger.info(f"Chunk overlap: {settings.CHUNK_OVERLAP} tokens")
    logger.info("=" * 60)
    
    try:
        await consume_indexing_events()
    except Exception as e:
        logger.error(f"Worker failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
