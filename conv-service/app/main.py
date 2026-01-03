import asyncio
from app.services.kafka import KafkaService
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

kafka_service = KafkaService()

async def process_message(message: dict):
    logger.info(f"Received message: {message}")
    
    # Extract sender info
    from_number = message.get("from")
    if not from_number:
        logger.warning("Message missing 'from' field")
        return

    # Echo response
    response = {
        "to": from_number,
        "type": "text",
        "content": {
            "text": "we got ur msgs"
        }
    }
    
    await kafka_service.send_message(settings.KAFKA_TOPIC_OUTGOING, response)

async def main():
    await kafka_service.start()
    try:
        await kafka_service.consume_messages(process_message)
    except KeyboardInterrupt:
        pass
    finally:
        await kafka_service.stop()

if __name__ == "__main__":
    asyncio.run(main())
