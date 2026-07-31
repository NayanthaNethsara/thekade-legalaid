import asyncio
import re
from collections.abc import Awaitable, Callable
from typing import Any, NamedTuple

from google.api_core.client_options import ClientOptions
from google.cloud import modelarmor_v1
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.core.config import ModelArmorSettings
from app.core.logging import get_logger
from app.orchestrator.constants import (
    LANGUAGE_NAMES,
    LANGUAGE_PERSONA_NOTES,
    LANGUAGE_SCRIPT_RULES,
)
from app.orchestrator.nodes.summarize import should_summarize
from app.orchestrator.prompts import GUARDRAIL_REFUSAL_PROMPT
from app.orchestrator.state import AgentState
from app.orchestrator.utils.trace import node_finish, node_start
from app.orchestrator.utils.turns import (
    latest_user_text,
    message_text,
    render_conversation_history,
    render_llm_input,
)

logger = get_logger(__name__)

_REFUSAL_FALLBACKS = {
    "en": (
        "No worries — anyway, who are you shopping for? I'd love to help you find something good."
    ),
    "si": "කමක් නෑ! ඉතින් කාට හරි තෑග්ගක් හොයනවද? මම උදව් කරන්නම්.",
    "ta": "பரவாயில்லை! யாருக்காவது பரிசு தேடுறீங்களா? நான் உதவுறேன்.",
    "singlish": "Kamak na! Ithin, kaatada gift ekak hoyanne? Mama udaw karannam.",
    "tanglish": "Paravaa illa! Yaaruku gift thedureengala? Naan help panren.",
}

_SCREENING_ERROR = "screening_error"

_BLOCK_MESSAGES = {
    "denylist": "Blocked by denylist match",
    "model_armor": "Blocked by Model Armor",
    "unsafe": "Blocked by safety classifier",
    _SCREENING_ERROR: "Screening layer failed; redirected fail-closed",
}

# Model Armor's per-filter result is a oneof across these fields; read
# defensively so an SDK version change degrades to no detail rather than error.
_ARMOR_FILTER_FIELDS = (
    "rai_filter_result",
    "sdp_filter_result",
    "pi_and_jailbreak_filter_result",
    "malicious_uri_filter_result",
    "csam_filter_filter_result",
    "virus_scan_filter_result",
)


class Block(NamedTuple):
    reason: str
    detail: str = ""


def build_model_armor_client(settings: ModelArmorSettings) -> modelarmor_v1.ModelArmorAsyncClient:
    return modelarmor_v1.ModelArmorAsyncClient(
        client_options=ClientOptions(api_endpoint=settings.api_endpoint)
    )


def compile_denylist(patterns: list[str]) -> list[re.Pattern[str]]:
    compiled: list[re.Pattern[str]] = []
    for pattern in patterns:
        try:
            compiled.append(re.compile(pattern, re.IGNORECASE))
        except re.error:
            logger.warning("guardrail.bad_denylist_pattern", pattern=pattern)
    return compiled


async def guard_input(
    state: AgentState,
    *,
    patterns: list[re.Pattern[str]],
    armor_client: modelarmor_v1.ModelArmorAsyncClient | None,
    armor_settings: ModelArmorSettings,
    classifier_model: BaseChatModel,
    refusal_model: BaseChatModel,
    llm_check: bool,
    classifier_prompt: str,
) -> dict[str, Any]:
    node_start("GUARD INPUT NODE")

    text = latest_user_text(state["messages"])
    if not text:
        node_finish("GUARD INPUT NODE", Blocked="no", Note="empty input")
        return {"blocked": False}

    logger.info("orchestrator.guardrail.evaluating", text=text)

    history = render_conversation_history(state["messages"], max_turns=4, exclude_last=True)

    block = await _evaluate(
        text,
        patterns,
        armor_client,
        armor_settings,
        classifier_model if llm_check else None,
        classifier_prompt,
        history,
    )
    if block is None:
        logger.info("orchestrator.guardrail.passed")
        node_finish("GUARD INPUT NODE", Blocked="no")
        return {"blocked": False}

    language = state.get("detected_language", "")
    _log_block(block, state["channel"])
    recent_replies = [
        message_text(msg)
        for msg in state["messages"][-6:]
        if isinstance(msg, AIMessage) and message_text(msg)
    ]
    reply = await _gentle_refusal(refusal_model, block.reason, language, recent_replies)
    logger.info("orchestrator.guardrail.refused", reason=block.reason, reply=reply)
    node_finish("GUARD INPUT NODE", Blocked="yes", Reason=block.reason)
    return {
        "blocked": True,
        "messages": [AIMessage(content=reply)],
        "formatted_reply": reply,
        "cards": [],
        "actions": [],
        "rendered_turns": [{"user": text, "reply": reply, "cards": [], "actions": []}],
    }


def route_after_guard(state: AgentState) -> str:
    if state.get("blocked"):
        return "blocked"
    return should_summarize(state)


async def _noop_guard(state: AgentState) -> dict[str, Any]:
    return {"blocked": False}


def build_noop_guard() -> Callable[[AgentState], Awaitable[dict[str, Any]]]:
    """Return a guard callable that always passes, preserving a single graph topology."""
    return _noop_guard


async def _evaluate(
    text: str,
    patterns: list[re.Pattern[str]],
    armor_client: modelarmor_v1.ModelArmorAsyncClient | None,
    armor_settings: ModelArmorSettings,
    classifier_model: BaseChatModel | None,
    classifier_prompt: str,
    history: str = "",
) -> Block | None:
    if any(pattern.search(text) for pattern in patterns):
        return Block("denylist")

    screens: dict[str, Block | None] = {"armor": None, "classify": None}
    coros: list[Awaitable[Block | None]] = []
    keys: list[str] = []
    if armor_client is not None:
        coros.append(_armor_check(armor_client, armor_settings, text))
        keys.append("armor")
    if classifier_model is not None:
        coros.append(_classify(classifier_model, classifier_prompt, text, history))
        keys.append("classify")

    for key, result in zip(keys, await asyncio.gather(*coros), strict=True):
        screens[key] = result
    return screens["armor"] or screens["classify"]


def _log_block(block: Block, channel: str) -> None:
    fields: dict[str, str] = {
        "reason": block.reason,
        "channel": channel,
        "msg": _BLOCK_MESSAGES.get(block.reason, "Blocked by the guardrail"),
    }
    if block.detail:
        fields["detail"] = block.detail
    log = logger.error if block.reason == _SCREENING_ERROR else logger.warning
    log("guardrail.blocked", **fields)


async def _gentle_refusal(
    model: BaseChatModel, reason: str, language: str, recent_replies: list[str] | None = None
) -> str:
    # Flagged text is never sent to the model -- only reason and language tag --
    # so a blocked prompt cannot inject into the reply.
    system_content = GUARDRAIL_REFUSAL_PROMPT.format(
        reason=reason,
        language=_language_name(language),
        script_rule=_script_rule(language),
        persona_note=_persona_note(language),
    )
    if recent_replies:
        replies_str = "\n".join(f"- {r}" for r in recent_replies)
        system_content += (
            f"\n\nTo avoid repetition, here are your most recent replies to the customer. "
            f"Do NOT reuse or repeat these phrases/questions:\n{replies_str}"
        )
    human_content = "Respond warmly in character as Kakille now."
    prompt = [
        SystemMessage(content=system_content),
        HumanMessage(content=human_content),
    ]
    logger.info(
        "orchestrator.guardrail.refusal.input",
        reason=reason,
        language=language,
        llm_input=render_llm_input(prompt),
    )
    try:
        response = await model.ainvoke(prompt)
    except Exception:
        logger.exception("guardrail.refusal_failed")
        return _fallback_refusal(language)
    text = message_text(response)
    logger.info("orchestrator.guardrail.refusal.output", response_text=text)
    return text.strip() or _fallback_refusal(language)


async def _armor_check(
    client: modelarmor_v1.ModelArmorAsyncClient, settings: ModelArmorSettings, text: str
) -> Block | None:
    try:
        response = await client.sanitize_user_prompt(
            request=modelarmor_v1.SanitizeUserPromptRequest(
                name=settings.template_path,
                user_prompt_data=modelarmor_v1.DataItem(text=text),
            )
        )
    except Exception as error:
        return Block(_SCREENING_ERROR, detail=f"model_armor: {error}")
    result = response.sanitization_result
    if result.filter_match_state == modelarmor_v1.FilterMatchState.MATCH_FOUND:
        return Block("model_armor", detail=_armor_detail(result))
    return None


async def _classify(
    model: BaseChatModel, classifier_prompt: str, text: str, history: str = ""
) -> Block | None:
    content = ""
    if history:
        content += f"Recent conversation history:\n{history}\n\n"
    content += f"LATEST Customer Message to evaluate:\n{text}"

    prompt = [SystemMessage(content=classifier_prompt), HumanMessage(content=content)]
    logger.info(
        "orchestrator.guardrail.classify.input",
        llm_input=render_llm_input(prompt),
    )
    try:
        response = await model.ainvoke(prompt)
    except Exception as error:
        return Block(_SCREENING_ERROR, detail=f"classifier: {error}")
    raw = response.content if isinstance(response.content, str) else str(response.content)
    logger.info("orchestrator.guardrail.classify.output", raw=raw)
    if _parse_verdict(raw) == "UNSAFE":
        return Block("unsafe")
    return None


def _armor_detail(sanitization_result: Any) -> str:
    try:
        matched = [
            name
            for name, result in sanitization_result.filter_results.items()
            if _armor_filter_matched(result)
        ]
    except Exception:
        return ""
    return ", ".join(sorted(matched))


def _armor_filter_matched(result: Any) -> bool:
    return any(
        getattr(getattr(result, field, None), "match_state", None)
        == modelarmor_v1.FilterMatchState.MATCH_FOUND
        for field in _ARMOR_FILTER_FIELDS
    )


def _parse_verdict(raw: str) -> str:
    upper = raw.upper()
    if "UNSAFE" in upper:
        return "UNSAFE"
    if "OUT_OF_SCOPE" in upper:
        return "OUT_OF_SCOPE"
    return "IN_SCOPE"


def _language_name(tag: str) -> str:
    return LANGUAGE_NAMES.get(tag, "the same language the customer was using")


def _script_rule(tag: str) -> str:
    return LANGUAGE_SCRIPT_RULES.get(
        tag, "Use the same script the customer used and never mix scripts."
    )


def _persona_note(tag: str) -> str:
    return LANGUAGE_PERSONA_NOTES.get(
        tag, "Keep a warm, respectful tone; avoid crude slang or rough address."
    )


def _fallback_refusal(language: str) -> str:
    return _REFUSAL_FALLBACKS.get(language, _REFUSAL_FALLBACKS["en"])
