import logging
import sys

def setup_logging(level: str = "INFO") -> None:
    """
    Configure root logger with stream handler to stdout.
    Example format: 2025-09-21 15:30:00 | INFO | app.services.rag.vectorstore | Loading FAISS index...
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Silence noisy libs if needed
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
