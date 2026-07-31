import logging
from typing import cast

import structlog


def configure_logging(level: str = "INFO") -> None:
    """Configure structlog to emit JSON logs suitable for container stdout."""

    logging.basicConfig(format="%(message)s", level=getattr(logging, level.upper(), logging.INFO))

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))


def clip(text: object, limit: int = 500) -> str:
    """Shorten a log payload so multi-kilobyte prompts stay readable in logs."""
    flattened = " ".join(str(text).split())
    if len(flattened) <= limit:
        return flattened
    return flattened[:limit] + f"… [+{len(flattened) - limit} chars]"
