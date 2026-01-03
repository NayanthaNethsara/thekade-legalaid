from app.services.kafka import KafkaService
from app.core.config import settings
from app.utils.logger import setup_logger
import logging

logger = setup_logger(__name__)

class MessageProcessor:
    def __init__(self, kafka_service: KafkaService):
        self.kafka_service = kafka_service

    async def process(self, message: dict):
        """
        Process incoming Kafka messages.
        This method allows for scalable processing logic (e.g., routing based on type).
        """
        logger.info(f"Processing message: {message}")
        
        try:
            # Basic validation
            if not message.get("from"):
                logger.warning("Message missing 'from' field, skipping.")
                return
            
            await self.send_echo_reply(message)

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)

    async def send_echo_reply(self, original_message: dict):
        from_number = original_message.get("from")
        
        response = {
            "to": from_number,
            "type": "text",
            "content": {
                "text": "we got ur msgs"
            }
        }
        
        await self.kafka_service.send_message(settings.KAFKA_TOPIC_OUTGOING, response)
