from app.core.graph import Node, GraphContext
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

class OnboardingNode(Node):
    async def process(self, context: GraphContext) -> Optional[Node]:
        logger.info("Executing OnboardingNode")
        
        phone_number = context.message.get("from")
        if not phone_number:
            logger.error("No phone number found in message context")
            return None

        # Check if user exists using repository
        user = await context.user_repo.get_by_phone_number(phone_number)
        
        if not user:
            logger.info(f"Creating new user for {phone_number}")
            user = await context.user_repo.create(phone_number)
        else:
            logger.info(f"User found: {user.id}")

        context.user = user
            
        return None
