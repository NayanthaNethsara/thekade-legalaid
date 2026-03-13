from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.state import AgentState
from app.core.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

SYSTEM_PROMPT = """You are the LegalAid WhatsApp assistant.

Responsibilities:
- Keep track of the ongoing chat and answer using the current conversation context.
- Decide when a tool is required before answering.
- Use tools when the user asks to schedule a meeting or when legal retrieval is needed.
- If a required tool input is missing, ask a concise follow-up question.
- Keep final WhatsApp replies concise, clear, and action-oriented.
"""


def build_chat_agent_node(tools: list[BaseTool]):
    async def chat_agent_node(state: AgentState):
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY is not configured; returning fallback response")
            return {
                "messages": [
                    AIMessage(
                        content=(
                            "I cannot process your request right now because the AI model is not configured."
                        )
                    )
                ]
            }

        model = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )
        if tools:
            model = model.bind_tools(tools)

        prompt_messages = [SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
        response = await model.ainvoke(prompt_messages)

        tool_call_names = [call.get("name") for call in getattr(response, "tool_calls", []) or []]
        if tool_call_names:
            logger.info(f"[{state.get('user_phone')}] requested tools: {tool_call_names}")

        return {"messages": [response]}

    return chat_agent_node