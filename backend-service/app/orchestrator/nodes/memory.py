from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_config

from app.core.logging import get_logger
from app.core.security.phone import to_local_display
from app.orchestrator.prompts import COMBINED_MEMORY_EXTRACT_PROMPT
from app.orchestrator.state import AgentState
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import (
    render_last_exchanges,
    render_llm_input,
)
from app.repositories.customer_memory_repository import CustomerMemoryRepository
from app.repositories.customer_profile_repository import (
    CustomerProfileData,
    CustomerProfileRepository,
)
from app.repositories.source_repository import SourceRepository
from app.schemas.memory import CombinedExtraction

logger = get_logger(__name__)

_EXCHANGE_WINDOW = 3

# When the selected sources' combined text fits in this budget it is injected
# directly into the agent context; beyond it the agent gets the name list and
# reads individual sources with the read_source tool instead.
_INLINE_SOURCES_CHAR_BUDGET = 6000


def _user_identity() -> str | None:
    configurable = get_config().get("configurable") or {}
    identity = configurable.get("user_identity")
    return identity if isinstance(identity, str) and identity else None


def _selected_source_ids() -> list[str]:
    configurable = get_config().get("configurable") or {}
    source_ids = configurable.get("source_ids")
    if not isinstance(source_ids, list):
        return []
    return [item for item in source_ids if isinstance(item, str) and item]


def _whatsapp_number_line(channel: str | None, identity: str | None) -> str | None:
    """A profile line carrying the WhatsApp number the customer is messaging from.

    On WhatsApp the identity is the canonical phone, so we surface it as part of
    the loaded profile. Web accounts have no such number.
    """
    if channel != "whatsapp" or not identity:
        return None
    return f"WhatsApp number (the number they are messaging from): {to_local_display(identity)}"


async def _build_sources_context(source_repo: SourceRepository) -> str:
    """Render the user's selected sources for the agent prompt.

    Small selections inline their full text; larger ones list names and ids and
    defer content to the read_source tool.
    """
    source_ids = _selected_source_ids()
    if not source_ids:
        return ""

    configurable = get_config().get("configurable") or {}
    thread_id = configurable.get("thread_id")
    if not isinstance(thread_id, str):
        return ""
    parts = thread_id.split(":", 2)
    if len(parts) != 3:
        return ""
    principal_kind, principal_id, conversation_id = parts

    try:
        rows = await source_repo.get_many_with_content(
            source_ids, principal_kind, principal_id, conversation_id
        )
    except Exception as error:
        logger.warning("orchestrator.memory.load_sources_failed", error=str(error))
        return ""
    if not rows:
        return ""

    total_content_chars = sum(len(content or "") for _, content in rows)
    if total_content_chars and total_content_chars <= _INLINE_SOURCES_CHAR_BUDGET:
        blocks = []
        for source, content in rows:
            if content:
                blocks.append(f"--- Source: {source.name} ---\n{content}")
            else:
                blocks.append(f"--- Source: {source.name} --- (no extracted text)")
        return "User's selected sources for this turn:\n" + "\n\n".join(blocks)

    lines = [
        f"- id={source.id} | {source.name}{'' if content else ' (no extracted text)'}"
        for source, content in rows
    ]
    return (
        "User's selected sources for this turn (content too large to inline; "
        "use read_source(id) for the ones you need):\n" + "\n".join(lines)
    )


async def load_memory(
    state: AgentState,
    *,
    profile_repo: CustomerProfileRepository,
    memory_repo: CustomerMemoryRepository,
    source_repo: SourceRepository,
) -> dict[str, Any]:
    node_start("LOAD MEMORY NODE")

    identity = _user_identity()

    update: dict[str, Any] = {}

    if sources_context := await _build_sources_context(source_repo):
        update["sources_context"] = sources_context

    if not identity:
        node_finish(
            "LOAD MEMORY NODE",
            Identity="guest",
            Sources="loaded" if update.get("sources_context") else "none",
        )
        return update

    profile, memory_data = (
        await profile_repo.get(identity),
        await memory_repo.get(identity),
    )

    sections: list[str] = []
    if whatsapp_line := _whatsapp_number_line(state.get("channel"), identity):
        sections.append(whatsapp_line)
    if profile:
        profile_text = profile.to_prompt_text()
        if profile_text:
            sections.append(profile_text)
    if memory_data:
        try:
            parsed_memory = CombinedExtraction(**memory_data)
            memory_text = parsed_memory.to_formatted_text()
            if memory_text:
                sections.append(f"Preferences:\n{memory_text}")
        except Exception as e:
            logger.warning(
                "orchestrator.memory.load_failed_parsing",
                identity=identity,
                error=str(e),
            )

    combined = "\n\n".join(sections)
    if combined:
        update["memory"] = combined

    node_finish(
        "LOAD MEMORY NODE",
        Identity=identity,
        Memory="loaded" if combined else "none",
        Sources="loaded" if update.get("sources_context") else "none",
    )
    return update


async def write_memory(
    state: AgentState,
    *,
    user_identity: str | None,
    thread_id: str | None,
    model: BaseChatModel,
    profile_repo: CustomerProfileRepository,
    memory_repo: CustomerMemoryRepository,
) -> dict[str, Any]:
    node_start("WRITE MEMORY NODE")

    identity = user_identity
    exchange = render_last_exchanges(state["messages"], _EXCHANGE_WINDOW)

    if not identity:
        # Guests have no durable cross-conversation profile to write to.
        node_finish("WRITE MEMORY NODE", Identity="guest", Note="no durable profile")
        return {}

    if not exchange:
        node_finish("WRITE MEMORY NODE", Identity=identity, Note="no exchange")
        return {}

    existing_profile = await profile_repo.get(identity) or CustomerProfileData()
    should_extract = state.get("requires_memory_update", False)
    profile_updated = False
    memory_updated = False

    if should_extract:
        existing_memory_data = await memory_repo.get(identity) or {}
        existing_memory_obj = (
            CombinedExtraction(**existing_memory_data)
            if existing_memory_data
            else CombinedExtraction()
        )
        existing_memory_text = existing_memory_obj.to_formatted_text()

        extracted = await _extract_combined(
            model=model,
            exchange=exchange,
            existing_profile=existing_profile,
            existing_memory=existing_memory_text,
        )
        if extracted:
            profile_data = CustomerProfileData(
                name=extracted.name,
                phone=extracted.phone,
                addresses=[{"label": a.label, "value": a.value} for a in extracted.addresses],
            )
            profile_updated = await profile_repo.upsert_profile(identity, profile_data)

            new_memory_dict = extracted.to_memory_dict()
            if new_memory_dict != existing_memory_obj.to_memory_dict():
                await memory_repo.upsert(identity, new_memory_dict)
                memory_updated = True

    node_finish(
        "WRITE MEMORY NODE",
        Identity=identity,
        Profile="updated" if profile_updated else "unchanged",
        Memory="updated" if memory_updated else "unchanged",
    )
    return {}


async def _extract_combined(
    model: BaseChatModel,
    exchange: str,
    existing_profile: CustomerProfileData,
    existing_memory: str,
) -> CombinedExtraction | None:
    system_prompt = COMBINED_MEMORY_EXTRACT_PROMPT
    user_content = (
        f"Existing Profile contact details:\n{existing_profile.to_prompt_text() or '(none)'}\n\n"
        f"Existing Behavioral Preferences:\n{existing_memory or '(none)'}\n\n"
        f"Latest exchange:\n{exchange}"
    )
    prompt = [SystemMessage(content=system_prompt), HumanMessage(content=user_content)]
    logger.info("orchestrator.memory.extract_combined.input", llm_input=render_llm_input(prompt))

    structured_model = model.with_structured_output(CombinedExtraction)
    try:
        response = await structured_model.ainvoke(prompt)
        logger.info("orchestrator.memory.extract_combined.output", raw=str(response))
        if isinstance(response, CombinedExtraction):
            return response
    except Exception as e:
        logger.exception("orchestrator.memory.extract_combined.failed", error=str(e))
    return None
