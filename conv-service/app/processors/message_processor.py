from app.core.kafka import KafkaService
from app.core.config import settings
from app.utils.logger import setup_logger
from app.core.workflow import create_workflow
from app.core.db import SessionLocal
from app.core.redis import RedisClient
from app.repositories.redis.user import UserRedisRepository
from app.services.user import UserService
from app.repositories.user import UserRepository
from app.services.gemini import GeminiLLMService

logger = setup_logger(__name__)

class MessageProcessor:
    def __init__(self, kafka_service: KafkaService):
        self.kafka_service = kafka_service
        self.workflow = create_workflow()
        self.redis_client = RedisClient.get_instance()
        
        self.user_redis_repo = UserRedisRepository(self.redis_client)
        
        # Initialize LLM Service
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.warning("GEMINI_API_KEY not found in settings.")
            
        self.llm_service = GeminiLLMService(api_key)

    async def process(self, message: dict):
        """
        Process incoming Kafka messages using the LangGraph workflow.
        """
        logger.info(f"Processing message: {message}")
        
        try:
            if not message.get("from"):
                logger.warning("Message missing 'from' field, skipping.")
                return

            with SessionLocal() as db:
                user_repo = UserRepository(db)
                user_service = UserService(user_repo, self.user_redis_repo)
                
                # Prepare initial state
                initial_state = {
                    "message": message,
                    "user": None,
                    "next_node": None
                }
                
                # Configuration for passing dependencies (simplest way for now)
                config = {
                    "configurable": {
                        "db": db,
                        "kafka_service": self.kafka_service,
                        "user_service": user_service,
                        "llm_service": self.llm_service
                    }
                }
                
                await self.workflow.ainvoke(initial_state, config=config)

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            
    async def shutdown(self):
        await self.redis_client.close()
