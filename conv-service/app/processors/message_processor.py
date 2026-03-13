from app.core.nats import NatsService
from app.core.config import settings
from app.utils.logger import setup_logger
from app.core.graph import GraphContext, NodeGraph
from app.nodes.onboarding import OnboardingNode
from app.core.db import SessionLocal
from app.core.redis import RedisClient
from app.repositories.redis.user import UserRedisRepository
from app.services.user import UserService
from app.repositories.user import UserRepository

logger = setup_logger(__name__)

class MessageProcessor:
    def __init__(self, nats_service: NatsService):
        self.nats_service = nats_service
        self.node_graph = NodeGraph()
        self.redis_client = RedisClient.get_instance()
        
        self.user_redis_repo = UserRedisRepository(self.redis_client)
        pass

    async def process(self, message: dict):
        """
        Process incoming NATS messages using the Node Graph.
        """
        logger.info(f"Processing message: {message}")
        
        try:
            if not message.get("from"):
                logger.warning("Message missing 'from' field, skipping.")
                return

            with SessionLocal() as db:
                user_repo = UserRepository(db)
                user_service = UserService(user_repo, self.user_redis_repo)
                
                context = GraphContext(
                    message=message,
                    db=db,
                    nats_service=self.nats_service,
                    user_service=user_service
                )
                
                initial_node = OnboardingNode()
                await self.node_graph.run(context, initial_node)

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            
    async def shutdown(self):
        await self.redis_client.close()
