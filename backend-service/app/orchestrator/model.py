from collections.abc import Callable
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import LLMSettings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _log_retry(retry_state: Any) -> None:
    logger.warning(
        "orchestrator.model.retry",
        attempt=retry_state.attempt_number,
        exception=str(retry_state.outcome.exception()),
    )


_async_retry = retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=5),
    before_sleep=_log_retry,
)

_sync_retry = retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=5),
    before_sleep=_log_retry,
)


class RetryingChatGoogleGenerativeAI(ChatGoogleGenerativeAI):
    """Subclass of ChatGoogleGenerativeAI that retries transient errors on generation."""

    async def _agenerate(self, *args: Any, **kwargs: Any) -> Any:
        @_async_retry
        async def _run() -> Any:
            return await super(RetryingChatGoogleGenerativeAI, self)._agenerate(*args, **kwargs)

        return await _run()

    def _generate(self, *args: Any, **kwargs: Any) -> Any:
        @_sync_retry
        def _run() -> Any:
            return super(RetryingChatGoogleGenerativeAI, self)._generate(*args, **kwargs)

        return _run()


def _build_vertexai(settings: LLMSettings, **overrides: Any) -> BaseChatModel:
    return RetryingChatGoogleGenerativeAI(
        model=overrides.pop("model", settings.model),
        temperature=overrides.pop("temperature", settings.temperature),
        vertexai=True,
        project=settings.project or None,
        location=settings.location or None,
        **overrides,
    )


def _build_gemini(settings: LLMSettings, **overrides: Any) -> BaseChatModel:
    return RetryingChatGoogleGenerativeAI(
        model=overrides.pop("model", settings.model),
        temperature=overrides.pop("temperature", settings.temperature),
        google_api_key=settings.api_key,
        **overrides,
    )


# Provider registry: adding a backend means writing a builder and registering it
# here. Nothing else in the orchestrator depends on the concrete model type --
# only on the returned ``BaseChatModel`` -- so swapping providers stays local.
_BUILDERS: dict[str, Callable[..., BaseChatModel]] = {
    "vertexai": _build_vertexai,
    "gemini": _build_gemini,
}


def build_model(settings: LLMSettings, **overrides: Any) -> BaseChatModel:
    """Build the chat model for the configured provider."""
    try:
        builder = _BUILDERS[settings.provider]
    except KeyError as error:
        raise ValueError(f"Unknown LLM provider: {settings.provider!r}") from error
    return builder(settings, **overrides)


def build_utility_model(settings: LLMSettings) -> BaseChatModel:
    """Build the model for planning, classification, and extraction calls.

    These are single-pass structured-output tasks on the latency path: near-zero
    temperature for stable JSON, a hard output cap so a degenerate generation
    loop cannot stall the turn for a minute, and no thinking budget.
    """
    return build_model(
        settings,
        temperature=0.1,
        max_output_tokens=1024,
        thinking_budget=0,
    )


def build_agent_model(settings: LLMSettings) -> BaseChatModel:
    """Build the model for the reactive tool-calling agents that write the
    customer-facing reply. Uses ``generation_model_name`` so the reply can run on
    a stronger model than the utility tier without affecting planning latency."""
    return build_model(
        settings,
        model=settings.generation_model_name,
        max_output_tokens=4096,
        thinking_budget=0,
    )


def build_vision_model(settings: LLMSettings) -> BaseChatModel:
    """Build the multimodal model that identifies a product in an uploaded image.

    A single structured-output pass on the latency path: near-zero temperature
    for a stable verdict and a small output cap. Runs on the base ``model`` (a
    multimodal Gemini), so no separate provider or service is needed.
    """
    return build_model(
        settings,
        temperature=0.1,
        max_output_tokens=512,
        thinking_budget=0,
    )
