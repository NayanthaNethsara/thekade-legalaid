from typing import Optional, Dict, Any
from langchain_core.runnables import RunnableConfig
from app.core.state import AgentState
from app.utils.logger import setup_logger
from app.services.user import UserService

logger = setup_logger(__name__)

async def onboarding_node(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    logger.info("Executing OnboardingNode")
    
    # Extract dependencies from config
    user_service: UserService = config["configurable"]["user_service"]
    
    phone_number = state["message"].get("from")
    if not phone_number:
        logger.error("No phone number found in message context")
        return {}

    # Check if user exists using service
    user = await user_service.get_user_by_phone(phone_number)
    
    if not user:
        logger.info(f"Creating new user for {phone_number}")
        user = await user_service.create_user(phone_number)
    else:
        logger.info(f"User found: {user.id}")

    return {"user": user}
