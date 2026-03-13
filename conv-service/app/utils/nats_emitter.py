"""
NATS JetStream utilities for emitting indexing events.
"""
import asyncio
import logging
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from nats.aio.client import Client as NATS
from nats.js.errors import NotFoundError
from app.core.config import settings

logger = logging.getLogger(__name__)


class IndexingEventEmitter:
    """Emits indexing events to NATS JetStream."""
    
    def __init__(
        self,
        broker_url: Optional[str] = None,
        topic: Optional[str] = None
    ):
        """
        Initialize the NATS JetStream event emitter.
        
        Args:
            broker_url: NATS server URL
            topic: Subject to emit events to
        """
        self.broker_url = broker_url or settings.NATS_URL
        self.topic = topic or settings.NATS_SUBJECT_INDEXING_TRUSTED
        self.stream_name = settings.NATS_STREAM_NAME
        self.loop = asyncio.new_event_loop()
        self.nc: Optional[NATS] = None
        self.js = None
        
        if not self.broker_url:
            logger.warning("No NATS URL configured - events will be logged only")
        else:
            try:
                self.loop.run_until_complete(self._connect())
                logger.info(f"IndexingEventEmitter initialized: topic={self.topic}")
            except Exception as e:
                logger.error(f"Failed to initialize NATS client: {e}")

    async def _connect(self):
        self.nc = NATS()
        await self.nc.connect(servers=[self.broker_url])
        self.js = self.nc.jetstream()

        try:
            info = await self.js.stream_info(self.stream_name)
            subjects = set(info.config.subjects or [])
            if self.topic not in subjects:
                await self.js.update_stream(
                    name=self.stream_name,
                    subjects=sorted(subjects | {self.topic}),
                )
        except NotFoundError:
            await self.js.add_stream(name=self.stream_name, subjects=[self.topic])
    
    def emit_indexing_event(
        self,
        file_path: str,
        blob_url: Optional[str],
        document_id: int,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Emit an indexing event to NATS JetStream.
        
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
        
        if not self.js:
            logger.info(f"[DRY RUN] Would emit event to {self.topic}: {event}")
            return False
        
        try:
            payload = json.dumps(event).encode("utf-8")
            self.loop.run_until_complete(self.js.publish(self.topic, payload))
            logger.info(f"Emitted indexing event to {self.topic}: document_id={document_id}")
            return True
        except Exception as e:
            logger.error(f"Unexpected error emitting event: {e}")
            return False
    
    def close(self):
        """Close the NATS connection."""
        if self.nc and self.nc.is_connected:
            self.loop.run_until_complete(self.nc.drain())
            self.loop.run_until_complete(self.nc.close())
            logger.info("NATS connection closed")
        if not self.loop.is_closed():
            self.loop.close()
