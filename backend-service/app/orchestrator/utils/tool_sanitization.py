"""Shared normalization for Kakille MCP tool arguments.

The reactive tool-execution node applies these sanitization rules to every
Kakille tool call.  This module is the single source of truth for those rules.
"""

from typing import Any

_KAKILLE_PREFIX = "kakille_"

_SEARCH_TOOL = "kakille_search_products"
_SEARCH_ALLOWED_KEYS = frozenset({"q", "limit", "cursor", "category", "response_format"})

_SEARCH_RESULT_LIMIT = 20


def normalize_kakille_args(tool_name: str, tool_args: dict[str, Any]) -> dict[str, Any]:
    """Normalize flat Kakille tool arguments into the nested ``params`` envelope.

    Returns a new dict; the original is not mutated.
    """
    if not tool_name.startswith(_KAKILLE_PREFIX) or not tool_args:
        return tool_args

    normalized = dict(tool_args)
    if "params" not in normalized:
        normalized = {"params": normalized}

    if tool_name == _SEARCH_TOOL:
        normalized["params"] = _sanitize_search_params(normalized.get("params", {}))

    return normalized


def _sanitize_search_params(params: Any) -> Any:
    """Filter search params to the allowed keys; non-dict values pass through."""
    if not isinstance(params, dict):
        return params

    sanitized = {k: v for k, v in params.items() if k in _SEARCH_ALLOWED_KEYS}
    sanitized["limit"] = _SEARCH_RESULT_LIMIT
    sanitized["response_format"] = "json"
    return sanitized
