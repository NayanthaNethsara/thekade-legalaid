from langgraph.graph import StateGraph, START, END
from app.core.state import AgentState
from app.nodes.onboarding import onboarding_node
from app.nodes.intent_classifier import intent_classifier_node
from app.nodes.task_node import task_node
from app.nodes.chat_node import chat_node

def create_workflow():
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("onboarding", onboarding_node)
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("task", task_node)
    workflow.add_node("chat", chat_node)

    # Add edges
    workflow.add_edge(START, "onboarding")
    workflow.add_edge("onboarding", "intent_classifier")

    # Conditional logic for intent classifier
    def route_intent(state: AgentState):
        return state.get("next_node")

    workflow.add_conditional_edges(
        "intent_classifier",
        route_intent,
        {
            "task": "task",
            "chat": "chat"
        }
    )

    workflow.add_edge("task", END)
    workflow.add_edge("chat", END)

    return workflow.compile()
