from dataclasses import dataclass

# Cheap regex pre-filter for the most common prompt-injection openers, applied
# before the LLM scope classifier so the obvious cases never cost a model call.
DENYLIST_PATTERNS: tuple[str, ...] = (
    r"ignore (?:all |the )?(?:previous|prior|above) instructions",
    r"disregard (?:all |the )?(?:previous|prior|above)",
    r"you are now (?:in )?(?:dan|developer mode|jailbroken)",
    r"reveal (?:your )?(?:the )?(?:system )?(?:prompt|instructions)",
)

# The single definition of what this assistant will and will not talk about.
# It is injected into the scope classifier (``build_classifier_prompt``) and
# into the image-search prompt, so widening or narrowing the assistant's remit
# is an edit here and nowhere else. Placeholder -- replace with the real remit.
DOMAIN_GROUNDING = (
    "Topics in scope (PLACEHOLDER — replace with the real remit): general "
    "questions the assistant is built to answer, the tasks it can carry out on "
    "the user's behalf, the status of anything the user has already started, and "
    "questions about the service itself. Ordinary greetings, check-ins, and small "
    "talk are also in scope."
)


@dataclass(frozen=True)
class GuardrailPolicy:
    denylist_patterns: tuple[str, ...] = DENYLIST_PATTERNS
    llm_check_enabled: bool = True
    domain_grounding: str = DOMAIN_GROUNDING


DEFAULT_GUARDRAIL_POLICY = GuardrailPolicy()
