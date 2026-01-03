from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from app.core.config import settings
from app.utils.logger import setup_logger
import json
import ssl

logger = setup_logger(__name__)

class KafkaService:
    def __init__(self):
        self.producer = None
        self.consumer = None

    async def start(self):
        # Configure common connection parameters
        connection_params = {
            "bootstrap_servers": settings.KAFKA_BROKER_URL,
        }

        if settings.KAFKA_SSL:
            connection_params["ssl_context"] = ssl.create_default_context()

        if settings.KAFKA_USERNAME and settings.KAFKA_PASSWORD:
            connection_params.update({
                "security_protocol": "SASL_SSL" if settings.KAFKA_SSL else "SASL_PLAINTEXT",
                "sasl_mechanism": settings.KAFKA_SASL_MECHANISM.upper(),
                "sasl_plain_username": settings.KAFKA_USERNAME,
                "sasl_plain_password": settings.KAFKA_PASSWORD,
            })
        elif settings.KAFKA_SSL:
             connection_params["security_protocol"] = "SSL"

        self.producer = AIOKafkaProducer(
            **connection_params,
            value_serializer=lambda v: json.dumps(v).encode("utf-8")
        )
        await self.producer.start()

        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_TOPIC_INCOMING,
            **connection_params,
            group_id="conv-service-group",
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
            auto_offset_reset="earliest"
        )
        await self.consumer.start()
        logger.info("Kafka consumer and producer started")

    async def stop(self):
        if self.producer:
            await self.producer.stop()
        if self.consumer:
            await self.consumer.stop()
        logger.info("Kafka consumer and producer stopped")

    async def send_message(self, topic: str, message: dict):
        try:
            await self.producer.send_and_wait(topic, message)
            logger.info(f"Sent message to {topic}")
        except Exception as e:
            logger.error(f"Failed to send message: {e}")

    async def consume_messages(self, callback):
        try:
            async for msg in self.consumer:
                await callback(msg.value)
        except Exception as e:
            logger.error(f"Error consuming messages: {e}")
