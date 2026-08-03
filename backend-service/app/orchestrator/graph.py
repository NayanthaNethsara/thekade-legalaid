"""LangGraph state-graph definition for the orchestrator workflow.

This module contains only graph wiring -- node registration, edges, and
conditional routing.  All node implementations live in ``nodes/``.

Topology:

    START -> guard_input -> [blocked? -> END]
                         -> [summarize? -> summarize -> load_memory]
                         -> [no summarize -> load_memory]
          -> load_memory -> plan -> [route to target-goal agent]
          -> agent -> [tool calls? -> tools -> agent]   (reactive loop)
                   -> [no tool calls -> finalize_turn -> END]

The plan node is a router and strategist: it classifies the target goal and
writes turn guidance, but does not call tools. Each target-goal agent owns its
own tool calling through the reactive loop -- legal knowledge search, source
reads, notes, reminders -- without ending the turn on a dangling tool call.
"""

from collections.abc import Awaitable, Callable
from functools import partial
from typing import Any

from langchain_core.language_models import BaseChatModel, LanguageModelLike
from langchain_core.tools import BaseTool
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore

from app.orchestrator.nodes import (
    chat_agent,
    execute_model_tools,
    finalize_turn,
    load_memory,
    plan,
    route_after_agent,
    route_after_guard,
    route_to_agent,
    search_agent,
)
from app.orchestrator.nodes.summarize import summarize
from app.orchestrator.state import AgentState
from app.repositories.customer_memory_repository import CustomerMemoryRepository
from app.repositories.customer_profile_repository import CustomerProfileRepository
from app.repositories.source_repository import SourceRepository

GuardNode = Callable[..., Awaitable[dict[str, Any]]]


def build_graph(
    search_model: LanguageModelLike,
    chat_model: LanguageModelLike,
    base_model: LanguageModelLike,
    summarizer: BaseChatModel,
    tools: list[BaseTool],
    checkpointer: BaseCheckpointSaver[Any],
    store: BaseStore,
    profile_repo: CustomerProfileRepository,
    memory_repo: CustomerMemoryRepository,
    source_repo: SourceRepository,
    guard: GuardNode,
) -> CompiledStateGraph[Any, Any, Any, Any]:
    """Assemble and compile the orchestrator workflow."""
    builder = StateGraph(AgentState)

    builder.add_node("guard_input", guard)
    builder.add_node("summarize", partial(summarize, model=summarizer))
    builder.add_node(
        "load_memory",
        partial(
            load_memory,
            profile_repo=profile_repo,
            memory_repo=memory_repo,
            source_repo=source_repo,
        ),
    )
    builder.add_node("plan", partial(plan, model=summarizer))
    builder.add_node("search_agent", partial(search_agent, model=search_model))
    builder.add_node("chat_agent", partial(chat_agent, model=chat_model))

    builder.add_node("tools", partial(execute_model_tools, tools=tools))
    builder.add_node("finalize_turn", finalize_turn)

    builder.add_edge(START, "guard_input")
    builder.add_conditional_edges(
        "guard_input",
        route_after_guard,
        {"blocked": END, "summarize": "summarize", "load_memory": "load_memory"},
    )

    builder.add_edge("summarize", "load_memory")
    builder.add_edge("load_memory", "plan")

    # Hub and spoke routing from the planner to the target-goal agent
    builder.add_conditional_edges(
        "plan",
        route_to_agent,
        {
            "search_agent": "search_agent",
            "chat_agent": "chat_agent",
        },
    )

    # Reactive tool loop for both agents
    for agent in ("search_agent", "chat_agent"):
        builder.add_conditional_edges(
            agent,
            route_after_agent,
            {"tools": "tools", "respond": "finalize_turn"},
        )

    builder.add_conditional_edges(
        "tools",
        route_to_agent,
        {
            "search_agent": "search_agent",
            "chat_agent": "chat_agent",
        },
    )

    builder.add_edge("finalize_turn", END)

    return builder.compile(checkpointer=checkpointer, store=store)
