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
# is an edit here and nowhere else.
# CONTRACT: keep in sync with ``DOMAIN_KNOWLEDGE_PROMPT`` in ``prompts.py`` --
# anything the agent can search for must also be in scope here, or the guard
# blocks requests the tools could have answered.
DOMAIN_GROUNDING = (
    "Topics in scope: legal questions from people in Sri Lanka about their "
    "rights, obligations, and procedures — legislation and the Constitution "
    "(including fundamental rights, consumer rights, and Right to Information); "
    "property law (deeds, land registration, tenancy, landlord and tenant "
    "disputes, boundaries); criminal matters from the person's own side (police "
    "complaints, arrest and detention rights, bail, court procedure, victim "
    "support); family law (marriage, divorce, custody, maintenance, domestic "
    "violence protection, inheritance); and employment (EPF and ETF, "
    "termination and gratuity, the Labour Tribunal, wages, workplace rights). "
    "Also in scope: questions about documents the user uploaded, saving notes "
    "and reminders about their matter, questions about the service itself, and "
    "ordinary greetings, check-ins, and small talk. Describing a crime or abuse "
    "they have suffered or are accused of is in scope — they are seeking help."
)


@dataclass(frozen=True)
class GuardrailPolicy:
    denylist_patterns: tuple[str, ...] = DENYLIST_PATTERNS
    llm_check_enabled: bool = True
    domain_grounding: str = DOMAIN_GROUNDING


DEFAULT_GUARDRAIL_POLICY = GuardrailPolicy()
