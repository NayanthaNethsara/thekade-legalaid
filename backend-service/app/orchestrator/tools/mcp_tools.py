import asyncio
from typing import Any, cast

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.sessions import Connection, StreamableHttpConnection, create_session
from langchain_mcp_adapters.tools import load_mcp_tools as load_tools_for_session
from mcp import ClientSession

from app.core.config import McpSettings
from app.core.logging import get_logger

logger = get_logger(__name__)


class _SessionProxy:
    """Stable stand-in for a ``ClientSession`` whose live connection can be swapped."""

    def __init__(self, name: str, connection: Connection) -> None:
        self._name = name
        self._connection = connection
        self._inner: ClientSession | None = None
        self._reconnect = asyncio.Event()

    def _set(self, session: ClientSession | None) -> None:
        self._inner = session

    @property
    def reconnect_requested(self) -> asyncio.Event:
        return self._reconnect

    def _request_reconnect(self) -> None:
        self._inner = None
        self._reconnect.set()

    async def call_tool(self, *args: Any, **kwargs: Any) -> Any:
        inner = self._inner
        if inner is not None:
            try:
                return await inner.call_tool(*args, **kwargs)
            except Exception as error:
                logger.warning(
                    "orchestrator.mcp.persistent_call_failed",
                    server=self._name,
                    error=str(error),
                )
                self._request_reconnect()

        async with create_session(self._connection) as session:
            await session.initialize()
            return await session.call_tool(*args, **kwargs)

    def __getattr__(self, item: str) -> Any:
        # Tool loading needs list_tools/etc. off the live session; only call_tool
        # is on the hot path and is defined explicitly above.
        inner = self.__dict__.get("_inner")
        if inner is None:
            raise RuntimeError(f"MCP session '{self.__dict__.get('_name')}' is not connected")
        return getattr(inner, item)


class _PersistentServer:
    """Owns one MCP session inside a dedicated task and keeps it connected."""

    def __init__(self, client: MultiServerMCPClient, name: str, connection: Connection) -> None:
        self._client = client
        self._name = name
        self._proxy = _SessionProxy(name, connection)
        self._ready = asyncio.Event()
        self._stopped = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._connected = False

    @property
    def proxy(self) -> _SessionProxy:
        return self._proxy

    async def start(self) -> bool:
        """Open the session and return whether it connected on the first attempt."""
        self._task = asyncio.create_task(self._run())
        await self._ready.wait()
        return self._connected

    async def _run(self) -> None:
        while not self._stopped.is_set():
            self._proxy.reconnect_requested.clear()
            try:
                async with self._client.session(self._name) as session:
                    self._proxy._set(session)
                    self._connected = True
                    self._ready.set()
                    await self._wait_for_reconnect_or_stop()
            except Exception as error:
                logger.warning(
                    "orchestrator.mcp.session_failed", server=self._name, error=str(error)
                )
                self._proxy._set(None)
                self._connected = False
                self._ready.set()
                if self._stopped.is_set():
                    break
                await asyncio.sleep(2)
        self._proxy._set(None)

    async def _wait_for_reconnect_or_stop(self) -> None:
        waiters = [
            asyncio.create_task(self._proxy.reconnect_requested.wait()),
            asyncio.create_task(self._stopped.wait()),
        ]
        try:
            await asyncio.wait(waiters, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for waiter in waiters:
                waiter.cancel()

    async def stop(self) -> None:
        self._stopped.set()
        self._proxy.reconnect_requested.set()
        if self._task is not None:
            try:
                await self._task
            except Exception:
                logger.warning("orchestrator.mcp.stop_failed", server=self._name)


class McpToolManager:
    """Builds and owns the persistent MCP sessions and their LangChain tools."""

    def __init__(self, connections: dict[str, Connection]) -> None:
        self._connections = connections
        self._client = MultiServerMCPClient(connections)
        self._servers: list[_PersistentServer] = []

    async def start(self) -> list[BaseTool]:
        """Connect each server and return its tools, per-server transient on failure."""
        tools: list[BaseTool] = []
        for name, connection in self._connections.items():
            server = _PersistentServer(self._client, name, connection)
            if await server.start():
                self._servers.append(server)
                # The proxy duck-types ClientSession for the adapter's call path.
                tools.extend(await load_tools_for_session(cast(ClientSession, server.proxy)))
            else:
                await server.stop()
                logger.warning("orchestrator.mcp.using_transient_session", server=name)
                tools.extend(await self._client.get_tools(server_name=name))
        return tools

    async def stop(self) -> None:
        for server in self._servers:
            await server.stop()
        self._servers.clear()


async def load_mcp_tools(settings: McpSettings) -> tuple[list[BaseTool], McpToolManager | None]:
    """Connect to the configured MCP server(s) and return their tools.

    Returns the tools and the manager that owns their sessions; the caller stops
    the manager on shutdown. Returns ``([], None)`` when no MCP URL is configured.
    """
    if not settings.url:
        logger.info("orchestrator.mcp_disabled", reason="MCP_URL is empty")
        return [], None

    headers = {"Authorization": f"Bearer {settings.api_key}"} if settings.api_key else None
    connection: StreamableHttpConnection = {
        "transport": "streamable_http",
        "url": settings.url,
        "headers": headers,
    }
    manager = McpToolManager({"kakille": connection})
    tools = await manager.start()

    for i, t in enumerate(tools):
        if t.name == "kakille_track_order":
            tools[i] = _wrap_track_order_tool(t)

    logger.info(
        "orchestrator.mcp_tools_loaded",
        count=len(tools),
        names=[tool.name for tool in tools],
    )
    return tools, manager


def _wrap_track_order_tool(tool: BaseTool) -> BaseTool:
    """Interceptors to set response_format='json' on all tracking calls so we
    get structured JSON back.
    """
    original_invoke = tool.invoke
    original_ainvoke = tool.ainvoke

    def new_invoke(input: Any, *args: Any, **kwargs: Any) -> Any:
        if isinstance(input, dict):
            if "params" in input and isinstance(input["params"], dict):
                input["params"]["response_format"] = "json"
            else:
                input["response_format"] = "json"
        return original_invoke(input, *args, **kwargs)

    async def new_ainvoke(input: Any, *args: Any, **kwargs: Any) -> Any:
        if isinstance(input, dict):
            if "params" in input and isinstance(input["params"], dict):
                input["params"]["response_format"] = "json"
            else:
                input["response_format"] = "json"
        return await original_ainvoke(input, *args, **kwargs)

    tool.__dict__["invoke"] = new_invoke
    tool.__dict__["ainvoke"] = new_ainvoke
    return tool
