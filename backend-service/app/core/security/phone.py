import re

_DIGITS = re.compile(r"\D")
_SRI_LANKA_MOBILE = re.compile(r"^94\d{9}$")


class InvalidPhoneError(ValueError):
    """Raised when a phone number cannot be normalized to the canonical form."""


def normalize_phone(raw: str, default_country_code: str = "94") -> str:
    """Reduce any phone input to the canonical digits-only form (e.g. 94702358060).

    This is the single point where web input (`0702358060`), WhatsApp's `from`
    (`94702358060`), and international forms (`+94 70 235 8060`) converge, so the
    same person never lands in two accounts.

    Rules (Sri Lanka default):
    - strip everything but digits;
    - drop a leading `00` international prefix;
    - a single leading `0` (national trunk) becomes the country code;
    - a bare 9-digit subscriber number is prefixed with the country code;
    - an already-prefixed number is kept.
    """

    digits = _DIGITS.sub("", raw or "")

    if digits.startswith("00"):
        digits = digits[2:]

    if digits.startswith(default_country_code):
        canonical = digits
    elif digits.startswith("0"):
        canonical = default_country_code + digits[1:]
    elif len(digits) == 9:
        canonical = default_country_code + digits
    else:
        canonical = digits

    if not _SRI_LANKA_MOBILE.match(canonical):
        raise InvalidPhoneError(f"Cannot normalize phone number: {raw!r}")

    return canonical


def to_local_display(canonical: str) -> str:
    """Render a canonical SL mobile (94702358060) as the readable local form 070 235 8060.

    Used when showing the customer their own number back, since the digits-only
    canonical form reads like an opaque international string.
    """
    if not _SRI_LANKA_MOBILE.match(canonical):
        return canonical
    local = "0" + canonical[2:]
    return f"{local[:3]} {local[3:6]} {local[6:]}"
