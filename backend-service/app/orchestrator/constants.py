import datetime
from dataclasses import dataclass


@dataclass(frozen=True)
class CompactionPolicy:
    max_messages: int
    keep_messages: int


SL_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

PLAN_TIMEOUT_SECONDS: float = 30.0

COMPACTION_POLICIES = {
    "web": CompactionPolicy(max_messages=18, keep_messages=12),
    "whatsapp": CompactionPolicy(max_messages=12, keep_messages=8),
}
DEFAULT_COMPACTION_POLICY = COMPACTION_POLICIES["web"]
SUMMARY_MAX_CHARS: int = 2000
TITLE_MAX_CHARS: int = 60

LANGUAGE_NAMES = {
    "si": "Sinhala",
    "ta": "Tamil",
    "en": "English",
    "singlish": "Singlish (romanized Sinhala mixed with English, as the customer writes)",
    "tanglish": "Tanglish (romanized Tamil mixed with English, as the customer writes)",
}

LANGUAGE_TAGS = frozenset(LANGUAGE_NAMES)

LANGUAGE_SCRIPT_RULES = {
    "si": (
        "Write in Sinhala using Sinhala script (අ-ෆ). Do not transliterate "
        "Sinhala words into Latin letters. English brand or product names may "
        "stay in their original spelling."
    ),
    "ta": (
        "Write in Tamil using Tamil script (அ-ஹ). Do not transliterate Tamil "
        "words into Latin letters. English brand or product names may stay in "
        "their original spelling."
    ),
    "en": "Write in English using the Latin alphabet only.",
    "singlish": (
        "Write Singlish using ONLY Latin/Roman letters -- romanized Sinhala "
        "mixed with English, the way the customer typed it. NEVER use "
        "Sinhala-script characters (අ-ෆ); every Sinhala word must be romanized.\n"
        "Guidelines for natural Singlish:\n"
        "- Avoid literal translations of formal Sinhala or rigid English "
        "structures. Write colloquial, conversational messages.\n"
        "- Mix English loanwords naturally (e.g., 'court eka', 'case eka', "
        "'lawyer kenek', 'documents').\n"
        "- Use standard texting spellings: 'oyaa' (you), "
        "'oyata' (to you/for you), 'oyage' (your).\n"
        "- Ensure proper pronoun usage based on context:\n"
        "  * Use 'oyaa' (subject pronoun) for direct actions "
        "(e.g., 'oyaa kaalada?' - did you eat, 'oyaa complaint eka dunnada?').\n"
        "  * Use 'oyata' (dative pronoun) for states, feelings, or actions "
        "directed to them (e.g., 'oyata kohomada?' - how are you, "
        "'oyata kohomada help karanna puluwan?' - how can I help you?). "
        "Never use 'oyaa' or 'oya' in these situations (e.g., never say "
        "'oya kohomada' or 'oyaa kohomada inne?').\n"
        "  * Use 'oyage' (possessive pronoun) for 'your' "
        "(e.g., 'oyage case eka' - your case, 'oyage name eka').\n"
        "- Use natural, conversational texting words for agreement, negation, and acknowledgment:\n"
        "  * Use 'hari' (okay/got it) when confirming or acknowledging "
        "requests (e.g., 'hari, mama add kala' - okay, I added it, or "
        "'hari, mata puluwan' - okay, I can).\n"
        "  * Use 'ow' (yes) and 'ne' / 'nehe' (no/not) for simple agreement or denial.\n"
        "  * Use 'mata' (to me / for me) and 'epa' / 'epaa' (don't want / no need).\n"
        "Examples:\n"
        "  * Natural: 'Mata oyaage case eka gena kiyanna puluwan.' "
        "(Avoid stiff: 'Obage arakshitha anukaaya pariksha kireemata mata "
        "hakiyatha thibe.')\n"
        "  * Natural: 'Kohomada oyaata help karanna puluwan?'\n"
        "  * Natural: 'Ee gena note ekak save kala. Oyaata thawa mokak hari "
        "danaganna onida?'"
    ),
    "tanglish": (
        "Write Tanglish using ONLY Latin/Roman letters -- romanized Tamil mixed "
        "with English, the way the customer typed it. NEVER use Tamil-script "
        "characters (அ-ஹ); every Tamil word must be romanized."
    ),
}

LANGUAGE_PERSONA_NOTES = {
    "si": (
        "Warm, friendly but respectful Sinhala. Address the customer "
        "using the correct pronoun form based on the situation: ඔයා "
        "(oyaa - you) as the subject, ඔයාට (oyata - to you) for "
        "states/feelings, and ඔයාගේ (oyage - your) for possessives. "
        "For example, use 'ඔයාට kohomada?' (how are you?) and "
        "'oyaa kaalada?' (did you eat?). Never use 'ඔයා' for state "
        "questions (e.g., never say 'ඔයා kohomada'). "
        "Use natural Sinhala words for agreement and acknowledgment: "
        "'හරි' (okay/got it) to confirm or acknowledge (e.g., "
        "'හරි, මම add කළා' or 'හරි, මට පුළුවන්'), 'ඔව්' (yes), "
        "'නෑ' / 'නැහැ' (no/not), 'මට' (to/for me), and 'එපා' "
        "(don't want). "
        "Strictly prohibit street slang, rough/rude address words, "
        "and potentially offensive casual terms such as මචං (machan), "
        "බං (ban), අඩෝ (ado), යකෝ (yako), or උඹ (umba). "
        "Always maintain a neutral, polite, and respectful tone."
    ),
    "singlish": (
        "Warm, friendly but respectful Singlish. Address the customer "
        "using the correct pronoun form based on the situation: 'oyaa' "
        "(you) as the subject, 'oyata' (to you) for states/feelings, "
        "and 'oyage' (your) for possessives. For example, use "
        "'oyata kohomada?' (how are you?) and 'oyaa kaalada?' (did you "
        "eat?). Never use 'oyaa' for state questions (e.g., never say "
        "'oyaa kohomada'). "
        "Use natural Singlish words for agreement and acknowledgment: "
        "'hari' (okay/got it) to confirm or acknowledge (e.g., "
        "'hari, mama add kala' or 'hari, mata puluwan'), 'ow' (yes), "
        "'ne' / 'nehe' (no/not), 'mata' (to/for me), and 'epa' / "
        "'epaa' (don't want). "
        "Strictly prohibit street slang, rough/rude address words, "
        "and potentially offensive casual terms such as 'machan'/'machang', "
        "'ban', 'ado', 'yako', or 'umba'. "
        "Always maintain a neutral, polite, and respectful tone."
    ),
    "ta": (
        "Warm, friendly but respectful Tamil. Prefer the polite pronoun "
        "நீங்க (neenga) over rough/informal forms. Strictly prohibit "
        "street slang, rough/rude address words, and potentially "
        "offensive casual terms such as டேய் (dei), டா (da), or "
        "மச்சி (machi). "
        "Always maintain a neutral, polite, and respectful tone."
    ),
    "tanglish": (
        "Warm, friendly but respectful Tanglish. Prefer the polite pronoun "
        "'neenga' over rough/informal forms. Strictly prohibit street "
        "slang, rough/rude address words, and potentially offensive "
        "casual terms such as 'dei', 'da', or 'machi'. "
        "Always maintain a neutral, polite, and respectful tone."
    ),
    "en": (
        "Warm, friendly, natural English -- like a helpful friend. Do "
        "NOT use artificial or stereotypical words like 'Aiyo', "
        "'Ayio', or 'Ayo' when something is missing or in any other "
        "context. "
        "Strictly prohibit street slang, crude/rough language, or "
        "overly casual/offensive terms. "
        "Always maintain a neutral, polite, and respectful tone "
        "using standard English phrasing."
    ),
}
