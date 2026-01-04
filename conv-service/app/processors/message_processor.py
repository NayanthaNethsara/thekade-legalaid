from app.core.kafka import KafkaService
from app.core.config import settings
from app.utils.logger import setup_logger
from app.core.graph import GraphContext, NodeGraph
from app.nodes.onboarding import OnboardingNode
from app.core.db import SessionLocal
from app.core.redis import RedisClient
from app.services.cache.user import UserCacheService

logger = setup_logger(__name__)

class MessageProcessor:
    def __init__(self, kafka_service: KafkaService):
        self.kafka_service = kafka_service
        self.node_graph = NodeGraph()
        self.redis_client = RedisClient.get_instance()
        self.user_cache = UserCacheService(self.redis_client)

    async def process(self, message: dict):
        """
        Process incoming Kafka messages using the Node Graph.
        """
        logger.info(f"Processing message: {message}")
        
        try:
            if not message.get("from"):
                logger.warning("Message missing 'from' field, skipping.")
                return

            with SessionLocal() as db:
                context = GraphContext(
                    message=message,
                    db=db,
                    kafka_service=self.kafka_service,
                    user_cache=self.user_cache
                )
                
                initial_node = OnboardingNode()
                await self.node_graph.run(context, initial_node)

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            
    async def shutdown(self):
        await self.redis_client.close()
