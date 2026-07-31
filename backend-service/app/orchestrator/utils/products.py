"""Product data flowing through the orchestrator.

The Kakille search tool returns JSON. It is parsed exactly once, at tool
execution time, into two views of the same data: markdown for the model to
read, and structured product dicts attached to the ToolMessage as its
``artifact``. Card extraction prefers the artifact; the regex parsers below
remain only as a fallback for tool messages checkpointed before artifacts
existed (and for ``kakille_get_product``, whose output is upstream markdown).

A product card dict has the keys: code, name, price, stock, image_url, url.
"""

import json
import re
from collections.abc import Sequence
from typing import Any

from langchain_core.messages import ToolMessage

from app.orchestrator.utils.turns import message_text

SEARCH_TOOLS = {"kakille_search_products"}
PRODUCT_TOOLS = {"kakille_get_product"}
ORDER_TOOLS = {"kakille_create_order"}

# Search list entry: "**1. Name**\n   ID: `CODE` · LKR 5,210 · In stock ...\n   [View product](URL)"
_SEARCH_ENTRY = re.compile(
    r"\*\*\d+\.\s*(?P<name>.+?)\*\*[ \t]*\n"
    r"[ \t]*ID:\s*`(?P<code>[^`]+)`(?P<meta>[^\n]*)\n"
    r"(?:[ \t]*Image:\s*(?P<image_url>\S+)[ \t]*\n)?"
    r"[ \t]*\[[^\]]+\]\((?P<url>https?://[^)]+)\)",
    re.MULTILINE,
)

# get_product detail fields.
_P_NAME = re.compile(r"^##\s*(.+?)\s*$", re.MULTILINE)
_P_CODE = re.compile(r"\*\*ID\*\*:\s*`([^`]+)`")
_P_PRICE = re.compile(r"\*\*Price\*\*:\s*(.+?)\s*$", re.MULTILINE)
_P_STOCK = re.compile(r"\*\*Stock\*\*:\s*(.+?)\s*$", re.MULTILINE)
_P_IMAGE = re.compile(r"\*\*Image\*\*:\s*(\S+)")
_P_URL = re.compile(r"\[View on Kakille\]\((https?://[^)]+)\)")

_MD_LINK = re.compile(r"\[[^\]]+\]\((https?://[^)]+)\)")
_BARE_URL = re.compile(r"https?://\S+")

# Cap on cards per turn so the carousel does not overwhelm the interface.
_MAX_CARDS = 10


# ---------------------------------------------------------------------------
# Search tool output -> markdown + structured products
# ---------------------------------------------------------------------------


def format_search_response(tool_output: Any) -> tuple[str, list[dict[str, Any]]]:
    """Render search JSON as markdown and return the structured products.

    Returns ``(markdown, products)``. When the output is not the expected
    JSON shape, the raw text passes through unchanged with no products.
    """
    raw_text = _tool_output_text(tool_output)
    if not raw_text:
        return "", []

    try:
        data = json.loads(raw_text)
    except (ValueError, TypeError):
        return raw_text, []

    if not isinstance(data, dict):
        return raw_text, []

    results = data.get("results", [])
    if not results:
        return "No products found.", []

    products = [_product_from_result(item) for item in results]
    markdown = _render_search_markdown(data, results, products)
    return markdown, products


def _tool_output_text(tool_output: Any) -> str:
    if not tool_output:
        return ""
    if isinstance(tool_output, list):
        if not tool_output:
            return ""
        item = tool_output[0]
        if isinstance(item, dict) and item.get("type") == "text":
            return str(item.get("text", "")).strip()
        return str(item).strip()
    return str(tool_output).strip()


def _product_from_result(item: dict[str, Any]) -> dict[str, Any]:
    currency = item.get("price", {}).get("currency", "LKR")
    amount = item.get("price", {}).get("amount")
    price = f"{currency} {amount:,.0f}" if amount is not None else None

    stock = "In stock" if item.get("in_stock") else "Out of stock"
    stock_level = item.get("stock_level")
    if stock_level:
        stock = f"{stock} ({stock_level})"

    return {
        "code": item.get("id", ""),
        "name": item.get("name", ""),
        "price": price,
        "stock": stock,
        "image_url": item.get("image_url") or None,
        "url": item.get("url", "") or None,
    }


def _render_search_markdown(
    data: dict[str, Any],
    results: list[dict[str, Any]],
    products: list[dict[str, Any]],
) -> str:
    query = data.get("applied_filters", {}).get("q", "")
    currency = results[0].get("price", {}).get("currency", "LKR")

    lines: list[str] = [
        f'## Kakille search: "{query}"',
        f"Showing {len(results)} results ({currency})\n",
    ]

    for idx, (item, product) in enumerate(zip(results, products, strict=True), start=1):
        meta_parts = [product["price"] or "N/A", product["stock"]]
        if item.get("ships_internationally"):
            meta_parts.append("ships internationally")
        lines.append(
            f"{idx}. **{product['name']}** · ID: `{product['code']}` · {' · '.join(meta_parts)}"
        )

    next_cursor = data.get("next_cursor")
    if next_cursor:
        lines.append("")
        lines.append(f'*More results available. Pass `cursor="{next_cursor}"` for the next page.*')

    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# Tool messages -> product cards and actions
# ---------------------------------------------------------------------------


def cards_from_ids(
    tool_messages: Sequence[ToolMessage], product_ids: Sequence[str]
) -> list[dict[str, Any]]:
    """Resolve the response node's chosen product IDs to full card data.

    The model only chooses which IDs to show; the card fields (price, image,
    url) always come from this turn's tool results, so they stay exact. IDs with
    no matching result are skipped. Order follows ``product_ids``. Capped at 10.
    """
    if not product_ids:
        return []
    return _select_by_ids(candidate_cards(tool_messages), list(product_ids))[:_MAX_CARDS]


def candidate_cards(tool_messages: Sequence[ToolMessage]) -> list[dict[str, Any]]:
    """Every product available from this turn's tool output, deduped by code.

    Detail lookups (``kakille_get_product``) rank above search results; multiple
    search lists are interleaved round-robin so a selection spanning searches
    stays varied.
    """
    cards: list[dict[str, Any]] = []
    seen: set[str] = set()

    for message in tool_messages:
        if message.name in PRODUCT_TOOLS:
            product = _parse_product(message_text(message))
            if product and product["code"].lower() not in seen:
                seen.add(product["code"].lower())
                cards.append(product)

    search_lists: list[list[dict[str, Any]]] = []
    for message in tool_messages:
        if message.name in SEARCH_TOOLS:
            products = _search_products_from(message)
            if products:
                search_lists.append(products)

    if search_lists:
        longest = max(len(products) for products in search_lists)
        for index in range(longest):
            for products in search_lists:
                if index < len(products):
                    code = products[index]["code"].lower()
                    if code not in seen:
                        seen.add(code)
                        cards.append(products[index])

    return cards


def _select_by_ids(cards: list[dict[str, Any]], shown_ids: list[str]) -> list[dict[str, Any]]:
    """Return cards matching ``shown_ids``, in that order, deduped."""
    by_code = {card["code"].lower(): card for card in cards}
    selected: list[dict[str, Any]] = []
    taken: set[str] = set()
    for pid in shown_ids:
        key = pid.lower()
        card = by_code.get(key)
        if card and key not in taken:
            taken.add(key)
            selected.append(card)
    return selected


def extract_actions(tool_messages: Sequence[ToolMessage]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for message in tool_messages:
        if message.name in ORDER_TOOLS:
            url = _first_url(message_text(message))
            if url:
                actions.append({"kind": "pay", "label": "Pay now", "url": url})
    return actions


def recent_shown_products(
    rendered_turns: Sequence[dict[str, Any]],
    max_turns: int = 3,
    max_per_turn: int = _MAX_CARDS,
) -> str:
    """Render products surfaced to the customer in recent turns, newest first.

    A turn's raw search results are pruned from message history once it ends, so
    this is how a later turn recovers what was on screen -- enough for the agent
    to resolve a positional reference ("the 2nd one") or a name back to its real
    product_id. Numbered per turn in the order they were displayed. Returns an
    empty string when nothing has been shown yet.
    """
    turns_with_cards = [turn for turn in rendered_turns if turn.get("cards")]
    if not turns_with_cards:
        return ""

    lines: list[str] = []
    for offset, turn in enumerate(reversed(turns_with_cards[-max_turns:])):
        lines.append("Most recent turn:" if offset == 0 else f"{offset + 1} turns back:")
        for index, card in enumerate(turn["cards"][:max_per_turn], start=1):
            name = card.get("name") or "Unknown"

            # The image_url and url are included so subsequent tool calls
            # (e.g. add_to_cart) can use the exact URL values originally
            # shown on the UI card rather than guessing them.
            parts = [f"id {card.get('code', '')}"]
            if card.get("price"):
                parts.append(card["price"])
            if card.get("stock"):
                parts.append(card["stock"])
            if card.get("image_url"):
                parts.append(f"image_url {card['image_url']}")
            if card.get("url"):
                parts.append(f"url {card['url']}")

            detail = " - ".join(part for part in parts if part.strip())
            lines.append(f"  {index}. {name} ({detail})")
    return "\n".join(lines)


def _search_products_from(message: ToolMessage) -> list[dict[str, Any]]:
    """Structured products from the artifact, or regex fallback for old threads."""
    artifact = message.artifact
    if isinstance(artifact, dict):
        products = artifact.get("products")
        if isinstance(products, list):
            return products
    return _parse_search(message_text(message))


# ---------------------------------------------------------------------------
# Regex fallbacks (pre-artifact checkpoints and get_product markdown)
# ---------------------------------------------------------------------------


def _parse_search(text: str) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for match in _SEARCH_ENTRY.finditer(text):
        price, stock = _parse_meta(match.group("meta"))
        image_url = match.group("image_url")
        cards.append(
            {
                "code": match.group("code").strip(),
                "name": match.group("name").strip(),
                "price": price,
                "stock": stock,
                "image_url": image_url.strip() if image_url else None,
                "url": match.group("url").strip(),
            }
        )
    return cards


def _parse_product(text: str) -> dict[str, Any] | None:
    name = _P_NAME.search(text)
    code = _P_CODE.search(text)
    if not name or not code:
        return None
    price = _P_PRICE.search(text)
    stock = _P_STOCK.search(text)
    image = _P_IMAGE.search(text)
    url = _P_URL.search(text)
    return {
        "code": code.group(1).strip(),
        "name": name.group(1).strip(),
        "price": price.group(1).strip() if price else None,
        "stock": stock.group(1).strip() if stock else None,
        "image_url": image.group(1).strip() if image else None,
        "url": url.group(1).strip() if url else None,
    }


def _parse_meta(meta: str) -> tuple[str | None, str | None]:
    """Split the dot-separated metadata line into (price, stock)."""
    price: str | None = None
    stock: str | None = None
    for raw in meta.split("·"):
        part = raw.strip()
        if not part:
            continue
        if "stock" in part.lower():
            stock = part
        elif any(char.isdigit() for char in part):
            price = part
    return price, stock


def _first_url(text: str) -> str | None:
    link = _MD_LINK.search(text)
    if link:
        return link.group(1)
    bare = _BARE_URL.search(text)
    if bare:
        return bare.group(0).rstrip(").,")
    return None
