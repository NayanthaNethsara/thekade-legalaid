from langchain_core.runnables import RunnableConfig


def _identity(config: RunnableConfig) -> str | None:
    configurable = (config or {}).get("configurable") or {}
    identity = configurable.get("user_identity")
    return identity if isinstance(identity, str) and identity else None
