import base64

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.core.config import VisionSettings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ImageIdentification(BaseModel):
    """Structured verdict from the vision model."""

    is_shoppable: bool = Field(
        description="True when the image shows an identifiable, appropriate item to search for; "
        "false only for inappropriate or unsearchable images."
    )
    query: str = Field(
        default="",
        description="Concise product search phrase (2-6 words) when is_shoppable; otherwise empty.",
    )
    reason: str = Field(
        default="",
        description="Short, friendly explanation shown to the customer when is_shoppable is false.",
    )


# Generic placeholder prompt. Tighten the "what counts as identifiable" rules
# and the query format to the real domain; the domain taxonomy itself is
# appended at runtime from ``GuardrailPolicy.domain_grounding``.
_PROMPT_HEAD = (
    "You are Kakille's image-search assistant. Your job is to turn an uploaded image "
    "into a short search query -- unless the image is inappropriate or has nothing "
    "identifiable to search for.\n\n"
    "Set is_shoppable=false ONLY when the image:\n"
    "- has a person, face, or selfie as its main subject;\n"
    "- is unsafe, explicit, violent, or otherwise inappropriate;\n"
    "- or shows nothing identifiable at all (blank, abstract, or too unclear).\n"
    "In those cases leave query empty and give a short, friendly one-sentence reason.\n\n"
    "Otherwise set is_shoppable=true and write 'query' in this structured format:\n"
    '"[broad, searchable type], preferably [specific details, colour, style, or features]"\n\n'
    "The broad-then-specific shape lets the downstream agent search wide first and then "
    "narrow down, so it still finds something close when the exact item is missing.\n"
    "- Lead with a broad, searchable form, never an artistic style ('drawing', "
    "'illustration') -- put style details in the 'preferably' part instead.\n"
    "- Do not invent brand names or text you cannot clearly read in the image.\n"
    "- Use the coverage list below only as a hint for natural wording. Never refuse an "
    "item just because it does not obviously fit a listed category.\n\n"
)


class ImageIdentifier:
    """Turns an inline image into a Kakille search verdict."""

    def __init__(self, model: BaseChatModel, settings: VisionSettings, categories: str) -> None:
        self._model = model.with_structured_output(ImageIdentification)
        self._settings = settings
        self._categories = categories

    async def identify(
        self, image_bytes: bytes, content_type: str, user_text: str = "", history_context: str = ""
    ) -> ImageIdentification:
        """Identify the product in a raw image. Never raises.

        Bad input (not an image, oversized, or a model error) degrades to a
        not-shoppable verdict with a friendly reason rather than an exception, so
        the endpoint always returns a usable result.
        """
        mime = (content_type or "").split(";")[0].strip().lower()
        if not mime.startswith("image/"):
            logger.warning("vision.invalid_type", content_type=content_type)
            return ImageIdentification(
                is_shoppable=False, reason="That file isn't an image. Please try a photo."
            )
        if not 0 < len(image_bytes) <= self._settings.max_image_bytes:
            logger.warning("vision.invalid_size", size=len(image_bytes))
            return ImageIdentification(
                is_shoppable=False, reason="I couldn't read that image. Please try another."
            )

        encoded = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime};base64,{encoded}"
        prompt_text = _build_prompt(user_text, self._categories, history_context)
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt_text},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]
        )
        try:
            result = await self._model.ainvoke([message])
        except Exception:
            logger.exception("vision.identify_failed")
            return ImageIdentification(
                is_shoppable=False, reason="I had trouble looking at that image. Please try again."
            )

        if isinstance(result, ImageIdentification):
            logger.info(
                "vision.identified",
                is_shoppable=result.is_shoppable,
                query=result.query,
            )
            return result
        logger.warning("vision.unstructured_output")
        return ImageIdentification(
            is_shoppable=False, reason="I couldn't tell what product that image shows."
        )


def _build_prompt(user_text: str, categories: str, history_context: str = "") -> str:
    prompt = _PROMPT_HEAD + categories
    if history_context:
        prompt += (
            f"\n\nBelow is the context from the ongoing conversation history to help you "
            f"understand what the user is looking for or asking about:\n"
            f'"""\n{history_context}\n"""'
        )
    if user_text.strip():
        prompt += (
            f"\n\nThe user also wrote: {user_text.strip()!r}. "
            "Use it to refine the query when it is relevant to the image."
        )
    return prompt


def build_image_identifier(
    model: BaseChatModel, settings: VisionSettings, categories: str
) -> ImageIdentifier:
    return ImageIdentifier(model, settings, categories)
