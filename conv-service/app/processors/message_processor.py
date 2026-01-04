from app.core.kafka import KafkaService
from app.core.config import settings
from app.utils.logger import setup_logger
from app.core.graph import GraphContext, NodeGraph
from app.nodes.onboarding import OnboardingNode
from app.core.db import SessionLocal
from app.core.redis import RedisClient
from app.repositories.redis.user import UserRedisRepository
from app.services.user import UserService
from app.repositories.user import UserRepository
import logging

logger = setup_logger(__name__)

class MessageProcessor:
    def __init__(self, kafka_service: KafkaService):
        self.kafka_service = kafka_service
        self.node_graph = NodeGraph()
        self.redis_client = RedisClient.get_instance()
        
        # Initialize repositories
        self.user_redis_repo = UserRedisRepository(self.redis_client)
        # Note: We need a DB session to init UserRepository, but we create session per request.
        # However, UserService needs Repo. So we should instantiate UserService inside the processing loop
        # where we have the DB session. OR, if UserService is stateless regarding DB session,
        # we can't really do that if Repo needs DB session in constructor.
        # Current UserRepository takes db in init. So we must init UserService per request.
        pass

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
                # Wiring dependencies per request
                user_repo = UserRepository(db)
                user_service = UserService(user_repo, self.user_redis_repo)
                
                context = GraphContext(
                    message=message,
                    db=db,
                    kafka_service=self.kafka_service,
                    user_service=user_service
                )
                
                initial_node = OnboardingNode()
                await self.node_graph.run(context, initial_node)

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            
    async def shutdown(self):
        await self.redis_client.close()
