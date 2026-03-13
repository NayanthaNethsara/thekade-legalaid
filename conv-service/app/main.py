from app.core.nats import NatsService
from app.processors.message_processor import MessageProcessor
import asyncio
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

async def main():
    nats_service = NatsService()
    message_processor = MessageProcessor(nats_service)
    
    await nats_service.start()
    
    try:
        # Use a lambda or method reference to pass processing to the processor
        await nats_service.consume_messages(message_processor.process)
    except KeyboardInterrupt:
        pass
    finally:
        await message_processor.shutdown()
        await nats_service.stop()

if __name__ == "__main__":
    asyncio.run(main())
