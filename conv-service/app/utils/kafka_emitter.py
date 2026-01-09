"""
Kafka utilities for emitting indexing events.
"""
import logging
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from kafka import KafkaProducer
from kafka.errors import KafkaError
from app.core.config import settings

logger = logging.getLogger(__name__)


class IndexingEventEmitter:
    """Emits indexing events to Kafka."""
    
    def __init__(
        self,
        broker_url: Optional[str] = None,
        topic: Optional[str] = None
    ):
        """
        Initialize the Kafka event emitter.
        
        Args:
            broker_url: Kafka broker URL
            topic: Topic to emit events to
        """
        self.broker_url = broker_url or settings.KAFKA_BROKER_URL
        self.topic = topic or settings.KAFKA_TOPIC_INDEXING_TRUSTED
        
        if not self.broker_url:
            logger.warning("No Kafka broker URL configured - events will be logged only")
            self.producer = None
        else:
            try:
                # Configure Kafka producer with optional authentication
                config = {
                    'bootstrap_servers': self.broker_url,
                    'value_serializer': lambda v: json.dumps(v).encode('utf-8'),
                    'key_serializer': lambda k: k.encode('utf-8') if k else None,
                }
                
                # Add authentication if configured
                if settings.KAFKA_USERNAME and settings.KAFKA_PASSWORD:
                    config.update({
                        'security_protocol': 'SASL_SSL' if settings.KAFKA_SSL else 'SASL_PLAINTEXT',
                        'sasl_mechanism': settings.KAFKA_SASL_MECHANISM,
                        'sasl_plain_username': settings.KAFKA_USERNAME,
                        'sasl_plain_password': settings.KAFKA_PASSWORD,
                    })
                
                self.producer = KafkaProducer(**config)
                logger.info(f"IndexingEventEmitter initialized: topic={self.topic}")
            except Exception as e:
                logger.error(f"Failed to initialize Kafka producer: {e}")
                self.producer = None
    
    def emit_indexing_event(
        self,
        file_path: str,
        blob_url: Optional[str],
        document_id: int,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Emit an indexing event to Kafka.
        
        Args:
            file_path: Original file path
            blob_url: Azure Blob URL (if uploaded)
            document_id: Database document ID
            metadata: Additional metadata
            
        Returns:
            True if event was emitted, False otherwise
        """
        event = {
            "event_type": "document_indexed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "file_path": file_path,
            "blob_url": blob_url,
            "document_id": document_id,
            "source": "admin-bulk",
            "trusted": True,
            "metadata": metadata
        }
        
        if not self.producer:
            logger.info(f"[DRY RUN] Would emit event to {self.topic}: {event}")
            return False
        
        try:
            future = self.producer.send(
                self.topic,
                value=event,
                key=str(document_id)
            )
            
            # Wait for send to complete with timeout
            result = future.get(timeout=10)
            logger.info(
                f"Emitted indexing event to {self.topic}: "
                f"document_id={document_id}, partition={result.partition}, offset={result.offset}"
            )
            return True
            
        except KafkaError as e:
            logger.error(f"Failed to emit indexing event: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error emitting event: {e}")
            return False
    
    def close(self):
        """Close the Kafka producer."""
        if self.producer:
            self.producer.flush()
            self.producer.close()
            logger.info("Kafka producer closed")
