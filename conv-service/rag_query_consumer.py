"""
RAG Query consumer that processes queries from Kafka and responds via Kafka.
This enables async query processing for WhatsApp and other sources.

Usage:
    python rag_query_consumer.py
"""
import asyncio
import logging
import signal
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.kafka import KafkaService
from app.services.rag_service import RAGService
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


async def consume_rag_queries():
    """
    Main worker loop that consumes RAG queries from Kafka and responds.
    """
    global should_stop
    
    logger.info("Starting RAG query consumer...")
    logger.info(f"Kafka broker: {settings.KAFKA_BROKER_URL}")
    logger.info(f"Consuming from: {settings.KAFKA_TOPIC_RAG_QUERIES}")
    logger.info(f"Publishing to: {settings.KAFKA_TOPIC_OUTGOING}")
    
    # Initialize services
    kafka_service = KafkaService()
    rag_service = RAGService()
    
    # Stats tracking
    processed_count = 0
    success_count = 0
    error_count = 0
    
    try:
        # Start consuming messages
        async for message in kafka_service.consume_messages(settings.KAFKA_TOPIC_RAG_QUERIES):
            if should_stop:
                logger.info("Stop signal received, breaking consumer loop...")
                break
            
            processed_count += 1
            
            # Extract query details
            question = message.get("question", "")
            user_id = message.get("from", "unknown")
            message_id = message.get("message_id", "")
            top_k = message.get("top_k")
            
            logger.info(f"[{processed_count}] Received query from {user_id}: {question[:50]}...")
            
            try:
                # Process the RAG query
                result = rag_service.query(
                    question=question,
                    top_k=top_k
                )
                
                # Format response message
                answer = result["answer"]
                citations = result["citations"]
                
                # Build citation text for the response
                citation_text = ""
                if citations:
                    citation_text = "\n\n📚 Sources:\n"
                    for citation in citations[:3]:  # Show top 3 sources
                        citation_text += f"• {citation['filename']}\n"
                
                # Send response back via Kafka
                response_message = {
                    "to": user_id,
                    "type": "text",
                    "content": {
                        "text": f"{answer}{citation_text}"
                    },
                    "metadata": {
                        "original_message_id": message_id,
                        "query_type": "rag",
                        "chunks_used": result["metadata"]["chunks_retrieved"]
                    }
                }
                
                await kafka_service.send_message(
                    settings.KAFKA_TOPIC_OUTGOING,
                    response_message
                )
                
                success_count += 1
                logger.info(
                    f"✅ Answered query from {user_id}: "
                    f"{len(answer)} chars, {len(citations)} citations"
                )
                
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Error processing query: {e}", exc_info=True)
                
                # Send error response
                error_message = {
                    "to": user_id,
                    "type": "text",
                    "content": {
                        "text": "Sorry, I encountered an error while processing your question. Please try again."
                    },
                    "metadata": {
                        "original_message_id": message_id,
                        "error": str(e)
                    }
                }
                
                try:
                    await kafka_service.send_message(
                        settings.KAFKA_TOPIC_OUTGOING,
                        error_message
                    )
                except Exception as send_error:
                    logger.error(f"Failed to send error message: {send_error}")
            
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
        logger.info("RAG query consumer shutdown complete")
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
    logger.info("RAG Query Consumer")
    logger.info("=" * 60)
    logger.info(f"Environment: {settings.DATABASE_URL.split('@')[1].split('/')[0]}")
    logger.info(f"Embedding model: {settings.GEMINI_EMBEDDING_MODEL}")
    logger.info(f"RAG top-k: {settings.RAG_TOP_K}")
    logger.info("=" * 60)
    
    try:
        await consume_rag_queries()
    except Exception as e:
        logger.error(f"Worker failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
