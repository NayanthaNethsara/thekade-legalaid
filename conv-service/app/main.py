from app.services.kafka import KafkaService
from app.services.message_processor import MessageProcessor
import asyncio
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

async def main():
    kafka_service = KafkaService()
    message_processor = MessageProcessor(kafka_service)
    
    await kafka_service.start()
    
    try:
        # Use a lambda or method reference to pass processing to the processor
        await kafka_service.consume_messages(message_processor.process)
    except KeyboardInterrupt:
        pass
    finally:
        await kafka_service.stop()

if __name__ == "__main__":
    asyncio.run(main())
