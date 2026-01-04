from app.core.graph import Node, GraphContext
from app.models.user import User
from app.utils.logger import setup_logger
from sqlalchemy.future import select

logger = setup_logger(__name__)

class OnboardingNode(Node):
    async def process(self, context: GraphContext) -> Optional[Node]:
        logger.info("Executing OnboardingNode")
        
        phone_number = context.message.get("from")
        if not phone_number:
            logger.error("No phone number found in message context")
            return None

        # Check if user exists
        # In synchronous SQLAlchemy with session, we typically iterate or use scalars().first()
        # Since we are in an async function but using sync DB driver (psycopg2),
        # strictly speaking we should be careful, but for this worker it's likely running in a thread pool 
        # or we accept blocking calls if we didn't setup async sqlalchemy.
        # Given setup was 'sqlalchemy', 'psycopg2-binary' (sync), we will use standard blocking calls.
        
        user = context.db.query(User).filter(User.phone_number == phone_number).first()
        
        if not user:
            logger.info(f"Creating new user for {phone_number}")
            user = User(phone_number=phone_number)
            context.db.add(user)
            context.db.commit()
            context.db.refresh(user)
        else:
            logger.info(f"User found: {user.id}")

        context.user = user
        
        # For now, we stop here or return a simplified 'EchoNode' if we wanted to replicate previous behavior.
        # But the request was just to "pipeline to node graph, first node is onboarding".
        # We can implement a simple 'Echo' logic here or return None.
        # Let's return None for now as we don't have other nodes.
        return None
