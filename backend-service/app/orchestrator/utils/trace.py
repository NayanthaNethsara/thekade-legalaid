import time
from contextvars import ContextVar
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)

_node_starts: ContextVar[dict[str, float]] = ContextVar("node_starts")


def _starts() -> dict[str, float]:
    try:
        return _node_starts.get()
    except LookupError:
        starts: dict[str, float] = {}
        _node_starts.set(starts)
        return starts


def node_start(name: str) -> None:
    _starts()[name] = time.perf_counter()
    logger.info("orchestrator.node.start", node=name)


def node_finish(name: str, **fields: Any) -> None:
    started = _starts().pop(name, None)
    elapsed_ms = 0.0
    if started is not None:
        elapsed_ms = (time.perf_counter() - started) * 1000

    formatted_fields = {k.lower(): v for k, v in fields.items()}
    logger.info(
        "orchestrator.node.finish",
        node=name,
        duration_ms=round(elapsed_ms, 1),
        **formatted_fields,
    )
