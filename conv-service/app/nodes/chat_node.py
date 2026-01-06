from typing import Dict, Any
from langchain_core.runnables import RunnableConfig
from app.core.state import AgentState
from app.utils.logger import setup_logger
from app.core.llm import LLMService

logger = setup_logger(__name__)

async def chat_node(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    logger.info("Executing ChatNode")
    
    llm_service: LLMService = config["configurable"]["llm_service"]
    message_body = state["message"].get("body", "")
    
    response = await llm_service.generate_response(message_body)
    logger.info(f"Generated chat response: {response}")
    
    # In a real scenario, we might want to send this response back via Kafka or similar
    # For now, we update the state with the response if we had a field for it, or just log it.
    
    return {}
