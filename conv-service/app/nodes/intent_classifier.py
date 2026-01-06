from typing import Dict, Any, Literal
from langchain_core.runnables import RunnableConfig
from app.core.state import AgentState
from app.utils.logger import setup_logger
from app.core.llm import LLMService

logger = setup_logger(__name__)

async def intent_classifier_node(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    logger.info("Executing IntentClassifierNode")
    
    # Extract dependencies
    llm_service: LLMService = config["configurable"]["llm_service"]
    
    message_body = state["message"].get("body", "")
    
    intent = await llm_service.classify_intent(message_body, ["task", "chat"])
        
    logger.info(f"Classified intent as: {intent}")
    return {"next_node": intent}
