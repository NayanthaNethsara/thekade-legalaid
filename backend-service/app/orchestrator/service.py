import asyncio
from collections.abc import AsyncIterator, Coroutine
from functools import partial
from typing import Any, Literal, cast

from google.cloud import modelarmor_v1
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.postgres.aio import AsyncPostgresStore
from psycopg_pool import AsyncConnectionPool

from app.core.config import Settings
from app.core.logging import get_logger
from app.core.metrics import TURNS_TOTAL
from app.db.redis import get_redis
from app.db.session import get_sessionmaker
from app.orchestrator.conversation_store import ConversationStore
from app.orchestrator.graph import GuardNode, build_graph
from app.orchestrator.guardrail_policy import DEFAULT_GUARDRAIL_POLICY
from app.orchestrator.model import build_agent_model, build_utility_model, build_vision_model
from app.orchestrator.nodes import (
    build_model_armor_client,
    build_noop_guard,
    compile_denylist,
    guard_input,
)
from app.orchestrator.nodes.memory import write_memory
from app.orchestrator.prompts import DOMAIN_KNOWLEDGE_PROMPT, build_classifier_prompt
from app.orchestrator.state import AgentState
from app.orchestrator.tools.cart_tools import build_cart_tools
from app.orchestrator.tools.checkout_tools import (
    build_active_checkouts_tool,
    build_checkout_history_tool,
    build_last_checkout_tool,
)
from app.orchestrator.tools.mcp_tools import McpToolManager, load_mcp_tools
from app.orchestrator.tools.tracking_tools import (
    build_list_tracked_orders_tool,
    build_track_all_active_orders_tool,
)
from app.repositories.cart_checkout_repository import CartCheckoutRepository
from app.repositories.cart_repository import CartRepository
from app.repositories.conversation_index_repository import ConversationIndexRepository
from app.repositories.customer_memory_repository import CustomerMemoryRepository
from app.repositories.customer_profile_repository import CustomerProfileRepository
from app.repositories.guest_checkout_contact_repository import GuestCheckoutContactRepository
from app.repositories.order_tracking_repository import OrderTrackingRepository
from app.schemas.chat import ChatResponse, ConversationDetail, ConversationSummary
from app.services.vision_service import (
    ImageIdentification,
    ImageIdentifier,
    build_image_identifier,
)

logger = get_logger(__name__)

_FALLBACK_REPLY = (
    "Hi! I'm the Kakille assistant. I'm still being set up — please try again shortly."
)

_ERROR_REPLY = (
    "Sorry, I'm having a bit of trouble right now. "
    "Please try again in a moment, or visit kakille.ai for help."
)

_IMAGE_UNAVAILABLE_REPLY = "Image search is unavailable right now. Please describe what you want."

_AGENT_NODES = frozenset({"search_agent", "checkout_agent", "tracking_agent", "chat_agent"})

_DISPLAY_MARKER = "[DISPLAY"

_SHUTDOWN_DRAIN_SECONDS = 10


def _chunk_text(chunk: Any) -> str:
    """Text content of a streamed message chunk (string or content-block list)."""
    content = getattr(chunk, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block if isinstance(block, str) else block.get("text", "")
            for block in content
            if isinstance(block, str) or (isinstance(block, dict) and block.get("type") == "text")
        )
    return ""


def _streamable_prefix(text: str) -> str:
    """The portion of ``text`` safe to stream, hiding the ``[DISPLAY: ...]`` marker.

    Everything from a complete marker onward is dropped, and a trailing partial
    marker (e.g. ``[DISP``) is held back until the next chunk resolves whether it
    is the marker or ordinary text.
    """
    index = text.find(_DISPLAY_MARKER)
    if index != -1:
        return text[:index]
    for held in range(min(len(text), len(_DISPLAY_MARKER) - 1), 0, -1):
        if text.endswith(_DISPLAY_MARKER[:held]):
            return text[: len(text) - held]
    return text


class _ReplyStreamer:
    """Turns LangGraph message-stream chunks into user-facing reply token events.

    Each agent invocation is a distinct graph step; when a new agent step begins
    it supersedes any earlier streamed text (e.g. a pre-tool "let me look" line),
    so a ``reset`` event is emitted before the replacement streams.
    """

    def __init__(self) -> None:
        self._step: Any = None
        self._emitted = ""
        self._buffer = ""

    def consume(self, chunk: Any, metadata: dict[str, Any]) -> list[dict[str, Any]]:
        if metadata.get("langgraph_node") not in _AGENT_NODES:
            return []

        events: list[dict[str, Any]] = []
        step = metadata.get("langgraph_step")
        if step != self._step:
            if self._emitted:
                events.append({"type": "reset"})
            self._step = step
            self._emitted = ""
            self._buffer = ""

        self._buffer += _chunk_text(chunk)
        safe = _streamable_prefix(self._buffer)
        if len(safe) > len(self._emitted):
            events.append({"type": "token", "text": safe[len(self._emitted) :]})
            self._emitted = safe
        return events


class Orchestrator:
    """Singleton managing the LLM-backed conversational graph.

    Call ``start`` once at boot (lifespan) and ``stop`` on shutdown. Both channel
    adapters (NATS handler, HTTP /chat) call ``respond``, passing the channel so
    the graph can format output accordingly. ``respond`` never raises -- it always
    returns a user-facing reply, falling back to an error message on failure.

    Conversation-history reads are delegated to ``ConversationStore``.
    """

    def __init__(self) -> None:
        self._is_disabled = True
        self._pool: AsyncConnectionPool | None = None
        # Held for the graph's lifetime; the gRPC channel is released on exit.
        self._armor_client: modelarmor_v1.ModelArmorAsyncClient | None = None
        self._graph: CompiledStateGraph[Any, Any, Any, Any] | None = None
        self._conversations: ConversationStore | None = None
        self._repos: _Repositories | None = None
        self._utility_model: BaseChatModel | None = None
        self._vision: ImageIdentifier | None = None
        self._vision_enabled: bool = False
        self._tools: list[BaseTool] | None = None
        self._mcp_manager: McpToolManager | None = None
        self._background_tasks: set[asyncio.Task[Any]] = set()

    async def start(self, settings: Settings) -> None:
        if not settings.llm.is_configured:
            logger.warning(
                "orchestrator.llm_disabled",
                provider=settings.llm.provider,
                reason="LLM provider is not configured",
            )
            return

        _, checkpointer, store = await self._open_persistence(settings)
        repos = _build_repositories()
        self._repos = repos
        tools = await self._build_tools(settings, repos)
        self._tools = tools

        model = build_agent_model(settings.llm)
        utility_model = build_utility_model(settings.llm)
        self._utility_model = utility_model
        self._vision = build_image_identifier(
            build_vision_model(settings.llm), settings.vision, DOMAIN_KNOWLEDGE_PROMPT
        )
        self._vision_enabled = settings.vision.enabled
        guard = self._build_guard(settings, utility_model, model)

        # Agent-specific tool pruning
        search_tools = [
            t
            for t in tools
            if t.name
            in (
                "kakille_search_products",
                "get_cart",
                "add_to_cart",
                "remove_from_cart",
                "change_cart_item",
                "clear_cart",
            )
        ]
        checkout_tools = [
            t
            for t in tools
            if t.name
            in (
                "kakille_create_order",
                "get_cart",
                "add_to_cart",
                "remove_from_cart",
                "change_cart_item",
                "clear_cart",
                "get_active_checkouts",
                "get_last_checkout",
                "get_checkout_history",
            )
        ]
        tracking_tools = [
            t
            for t in tools
            if t.name
            in (
                "kakille_track_order",
                "list_tracked_orders",
                "track_all_active_orders",
                "get_active_checkouts",
                "get_checkout_history",
                "get_last_checkout",
            )
        ]
        chat_tools = [
            t
            for t in tools
            if t.name in ("get_active_checkouts", "get_last_checkout", "get_checkout_history")
        ]

        search_model = model.bind_tools(search_tools) if search_tools else model
        checkout_model = model.bind_tools(checkout_tools) if checkout_tools else model
        tracking_model = model.bind_tools(tracking_tools) if tracking_tools else model
        chat_model = model.bind_tools(chat_tools) if chat_tools else model

        self._graph = build_graph(
            search_model=search_model,
            checkout_model=checkout_model,
            tracking_model=tracking_model,
            chat_model=chat_model,
            base_model=model,
            summarizer=utility_model,
            tools=tools,
            checkpointer=checkpointer,
            store=store,
            profile_repo=repos.profile,
            memory_repo=repos.memory,
            cart_repo=repos.cart,
            guest_contact_repo=repos.guest_contact,
            guard=guard,
        )
        self._conversations = ConversationStore(checkpointer)
        self._is_disabled = False

        logger.info(
            "orchestrator.ready",
            provider=settings.llm.provider,
            model=settings.llm.model,
            generation_model=settings.llm.generation_model_name,
            temperature=settings.llm.temperature,
            tools=len(tools),
            guardrail=guard is not None,
        )

    async def _open_persistence(
        self, settings: Settings
    ) -> tuple[AsyncConnectionPool, AsyncPostgresSaver, AsyncPostgresStore]:
        pool = AsyncConnectionPool(
            conninfo=settings.database.psycopg_dsn,
            open=False,
            kwargs={"autocommit": True},
        )
        await pool.open()
        self._pool = pool

        # langgraph's stubs want dict_row connections, but the saver handles the
        # default row factory at runtime.
        checkpointer = AsyncPostgresSaver(pool)  # type: ignore[arg-type]
        await checkpointer.setup()

        store = AsyncPostgresStore(pool)  # type: ignore[arg-type]
        await store.setup()
        return pool, checkpointer, store

    async def _build_tools(self, settings: Settings, repos: "_Repositories") -> list[BaseTool]:
        """External Kakille MCP tools plus our local, database-backed tools."""
        tools = await self._load_mcp_tools(settings)
        tools.append(build_active_checkouts_tool(repos.cart_checkout))
        tools.append(build_checkout_history_tool(repos.cart_checkout))
        tools.append(build_last_checkout_tool(repos.cart_checkout))
        tools.append(build_list_tracked_orders_tool(repos.order_tracking))
        tools.append(build_track_all_active_orders_tool(tools, repos.order_tracking))
        tools.extend(build_cart_tools(repos.cart))
        return tools

    async def _load_mcp_tools(self, settings: Settings) -> list[BaseTool]:
        """Load MCP tools, degrading to none if the server is unreachable.

        Tool loading must never block boot: if the MCP server is down the agent
        still answers (text-only) instead of failing to start.
        """
        for attempt in range(5):
            try:
                tools, manager = await load_mcp_tools(settings.mcp)
                self._mcp_manager = manager
                return tools
            except Exception as e:
                if attempt == 4:
                    logger.exception(
                        "orchestrator.mcp_tools_failed",
                        url=settings.mcp.url,
                        error=str(e),
                    )
                    return []
                logger.warning(
                    "orchestrator.mcp_tools_retry",
                    attempt=attempt,
                    url=settings.mcp.url,
                    error=str(e),
                )
                await asyncio.sleep(2**attempt)
        return []

    def _build_guard(
        self, settings: Settings, classifier_model: Any, refusal_model: Any
    ) -> GuardNode:
        policy = DEFAULT_GUARDRAIL_POLICY
        patterns = compile_denylist(list(policy.denylist_patterns))
        if settings.model_armor.is_active:
            self._armor_client = build_model_armor_client(settings.model_armor)

        if not (patterns or self._armor_client is not None or policy.llm_check_enabled):
            return build_noop_guard()

        classifier_prompt = (
            build_classifier_prompt(policy.domain_grounding) if policy.llm_check_enabled else ""
        )
        # Classification is a language-agnostic verdict, so it stays on the cheap
        # utility model; the refusal is a customer-facing reply, so it uses the
        # generation model for the same fluency as the rest of the conversation.
        return partial(
            guard_input,
            patterns=patterns,
            armor_client=self._armor_client,
            armor_settings=settings.model_armor,
            classifier_model=classifier_model,
            refusal_model=refusal_model,
            llm_check=policy.llm_check_enabled,
            classifier_prompt=classifier_prompt,
        )

    def get_tool(self, name: str) -> BaseTool | None:
        """Retrieve a registered tool by its name."""
        if self._is_disabled or not self._tools:
            return None
        return next((t for t in self._tools if t.name == name), None)

    def _run_config(
        self,
        thread_id: str,
        user_identity: str | None,
        principal_id: str | None,
        principal_kind: str | None,
    ) -> RunnableConfig:
        return {
            "configurable": {
                "thread_id": thread_id,
                "user_identity": user_identity,
                "principal_id": principal_id,
                "principal_kind": principal_kind,
            },
            "recursion_limit": 15,
        }

    async def respond(
        self,
        message: str,
        thread_id: str,
        channel: Literal["web", "whatsapp"] = "web",
        user_identity: str | None = None,
        principal_id: str | None = None,
        principal_kind: str | None = None,
        is_ui: bool = False,
    ) -> ChatResponse:
        """Run one orchestrator turn. Never raises -- always returns a reply.

        ``user_identity`` is the cross-channel key (canonical phone) for
        long-term memory; pass ``None`` for callers without one (e.g. web guests).
        """
        if self._is_disabled or self._graph is None:
            return ChatResponse(reply=_FALLBACK_REPLY)

        try:
            result = await self._graph.ainvoke(
                self._initial_state(message, channel, is_ui),
                config=self._run_config(thread_id, user_identity, principal_id, principal_kind),
                durability="exit",
            )
            response = await self._apply_turn_result(result, thread_id, user_identity, channel)
            TURNS_TOTAL.labels(channel=channel, status="success").inc()
            return response
        except Exception:
            TURNS_TOTAL.labels(channel=channel, status="error").inc()
            logger.exception("orchestrator.respond_failed", thread_id=thread_id, channel=channel)
            return ChatResponse(reply=_ERROR_REPLY)

    async def identify_image(
        self,
        image_bytes: bytes,
        content_type: str,
        caption: str = "",
        thread_id: str | None = None,
    ) -> ImageIdentification:
        """KakilleVision: identify a product in an uploaded image. Never raises.

        Kept here because the orchestrator owns the LLM models' lifecycle; the
        image never enters the conversation graph -- the caller turns the returned
        query into an ordinary text chat turn.
        """
        if not self._vision_enabled or self._vision is None:
            return ImageIdentification(is_shoppable=False, reason=_IMAGE_UNAVAILABLE_REPLY)

        history_context = ""
        if thread_id and self._conversations:
            try:
                detail = await self._conversations.get_detail(thread_id)
                if detail:
                    history_parts = []
                    if detail.summary.strip():
                        history_parts.append(f"Summary of conversation: {detail.summary.strip()}")
                    recent_messages = detail.messages[-3:]
                    if recent_messages:
                        messages_string = "\n".join(
                            f"- {message.role.capitalize()}: {message.content.strip()}"
                            for message in recent_messages
                        )
                        history_parts.append(f"Recent messages:\n{messages_string}")
                    if history_parts:
                        history_context = "\n\n".join(history_parts)
            except Exception:
                logger.exception("orchestrator.load_history_for_vision_failed", thread_id=thread_id)

        logger.info(
            "orchestrator.vision.input",
            thread_id=thread_id,
            caption=caption,
            has_history=bool(history_context),
            image_size_bytes=len(image_bytes),
            image_content_type=content_type,
        )

        import time

        start_time = time.perf_counter()
        identification = await self._vision.identify(
            image_bytes, content_type, caption, history_context=history_context
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        logger.info(
            "orchestrator.vision.output",
            thread_id=thread_id,
            is_shoppable=identification.is_shoppable,
            query=identification.query,
            reason=identification.reason,
            duration_ms=duration_ms,
        )
        return identification

    async def respond_stream(
        self,
        message: str,
        thread_id: str,
        channel: Literal["web", "whatsapp"] = "web",
        user_identity: str | None = None,
        principal_id: str | None = None,
        principal_kind: str | None = None,
        is_ui: bool = False,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream one turn: the final agent reply token by token, then the result."""
        if self._is_disabled or self._graph is None:
            yield {"type": "done", **ChatResponse(reply=_FALLBACK_REPLY).model_dump()}
            return

        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

        async def produce() -> None:
            try:
                async for event in self._run_turn_stream(
                    message,
                    thread_id,
                    channel,
                    user_identity,
                    principal_id,
                    principal_kind,
                    is_ui,
                ):
                    await queue.put(event)
            finally:
                await queue.put(None)

        self._spawn_background(produce())

        while True:
            event = await queue.get()
            if event is None:
                break
            yield event

    async def _run_turn_stream(
        self,
        message: str,
        thread_id: str,
        channel: str,
        user_identity: str | None,
        principal_id: str | None,
        principal_kind: str | None,
        is_ui: bool,
    ) -> AsyncIterator[dict[str, Any]]:
        """Drive the graph and yield stream events, ending with the authoritative result.

        Runs to completion independent of the client connection, so the turn is
        always checkpointed even when no one is reading the events.
        """
        streamer = _ReplyStreamer()
        final_state: dict[str, Any] | None = None
        try:
            async for mode, data in self._graph.astream(  # type: ignore[union-attr]
                self._initial_state(message, channel, is_ui),
                config=self._run_config(thread_id, user_identity, principal_id, principal_kind),
                stream_mode=["messages", "values"],
                durability="exit",
            ):
                if mode == "values":
                    final_state = cast(dict[str, Any], data)
                    continue
                for event in streamer.consume(*data):
                    yield event
        except Exception:
            TURNS_TOTAL.labels(channel=channel, status="error").inc()
            logger.exception(
                "orchestrator.respond_stream_failed", thread_id=thread_id, channel=channel
            )
            yield {"type": "error", **ChatResponse(reply=_ERROR_REPLY).model_dump()}
            return

        if final_state is None:
            TURNS_TOTAL.labels(channel=channel, status="error").inc()
            yield {"type": "error", **ChatResponse(reply=_ERROR_REPLY).model_dump()}
            return

        try:
            response = await self._apply_turn_result(final_state, thread_id, user_identity, channel)
            TURNS_TOTAL.labels(channel=channel, status="success").inc()
            yield {"type": "done", **response.model_dump()}
        except Exception:
            TURNS_TOTAL.labels(channel=channel, status="error").inc()
            raise

    def _spawn_background(self, coro: Coroutine[Any, Any, Any]) -> None:
        """Run a coroutine detached, holding a reference so it is not GC'd."""
        task = asyncio.create_task(coro)
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    async def _apply_turn_result(
        self,
        result: dict[str, Any],
        thread_id: str,
        user_identity: str | None,
        channel: str,
    ) -> ChatResponse:
        """Apply a finished turn's side effects and assemble the channel response.

        Shared by ``respond`` and ``respond_stream``: snapshots the cart into any
        checkout events, kicks off the background memory write, clears the cart
        after a checkout, and builds the ``ChatResponse``.
        """
        logger.info("orchestrator.responded", thread_id=thread_id, channel=channel)

        checkout_events = result.get("_checkout_events")
        if checkout_events and self._repos:
            # Snapshot the live cart (with names and prices) into each checkout
            # record before it is cleared. The create_order tool args carry only
            # product ids, so without this a later "reorder my last order" would
            # restore items as "unknown" at price 0.
            cart = await self._repos.cart.get_cart(thread_id)
            if cart and cart.items:
                rich_cart = [item.model_dump(exclude_none=True) for item in cart.items]
                for event in checkout_events:
                    event.setdefault("last_order", {})["cart"] = rich_cart

        is_guest = user_identity is None
        should_update_memory = bool(
            result.get("requires_memory_update")
            or checkout_events
            or result.get("tracking")
            or (is_guest and result.get("target_goal") == "checkout")
        )
        if should_update_memory:
            self._spawn_background(
                self._run_write_memory_background(
                    cast(AgentState, result), user_identity, thread_id
                )
            )

        if checkout_events and self._repos:
            await self._repos.cart.clear_cart(thread_id)

        self._index_conversation(thread_id, result.get("title"))

        return ChatResponse(
            reply=result["formatted_reply"],
            cards=result.get("cards", []),
            actions=result.get("actions", []),
            detected_emotion=result.get("detected_emotion", "neutral"),
            target_goal=result.get("target_goal", "chat"),
            title=result.get("title"),
            missing_fields=result.get("missing_fields", []),
            cart_checkouts=result.get("cart_checkouts", []),
            tracking=result.get("tracking") or [],
        )

    async def _run_write_memory_background(
        self, state: AgentState, user_identity: str | None, thread_id: str
    ) -> None:
        if not self._repos or not self._utility_model:
            return
        try:
            await write_memory(
                state,
                user_identity=user_identity,
                thread_id=thread_id,
                model=self._utility_model,
                profile_repo=self._repos.profile,
                memory_repo=self._repos.memory,
                guest_contact_repo=self._repos.guest_contact,
                cart_checkout_repo=self._repos.cart_checkout,
                order_tracking_repo=self._repos.order_tracking,
            )
        except Exception:
            logger.exception("orchestrator.write_memory_background_failed")

    def _index_conversation(self, thread_id: str, title: str | None) -> None:
        """Upsert the sidebar index for a web/guest thread so it can be listed
        without loading its checkpoint. WhatsApp threads have no sidebar, so skip."""
        if not self._repos:
            return
        parts = thread_id.split(":", 2)
        if len(parts) != 3 or parts[0] not in ("user", "guest"):
            return
        principal_kind, principal_id, _ = parts
        self._spawn_background(
            self._index_conversation_background(thread_id, principal_kind, principal_id, title)
        )

    async def _index_conversation_background(
        self, thread_id: str, principal_kind: str, principal_id: str, title: str | None
    ) -> None:
        if not self._repos:
            return
        try:
            await self._repos.conversation_index.upsert(
                thread_id, principal_kind, principal_id, title
            )
        except Exception:
            logger.exception("orchestrator.index_conversation_failed", thread_id=thread_id)

    @staticmethod
    def _initial_state(message: str, channel: str, is_ui: bool = False) -> dict[str, Any]:
        return {
            "messages": [HumanMessage(content=message)],
            "channel": channel,
            "formatted_reply": "",
            "plan": "",
            "cart": "",
            "missing_fields": [],
            "cart_checkouts": [],
            "tracking": [],
            "is_ui": is_ui,
            "_checkout_events": [],
        }

    async def list_conversations(
        self, principal_kind: str, principal_id: str
    ) -> list[ConversationSummary]:
        if self._repos is None:
            return []
        return await self._repos.conversation_index.list_for_principal(principal_kind, principal_id)

    async def get_conversation_detail(self, thread_id: str) -> ConversationDetail | None:
        if self._conversations is None:
            return None
        return await self._conversations.get_detail(thread_id)

    async def delete_conversation(self, thread_id: str) -> bool:
        if self._conversations is None:
            return False
        deleted = await self._conversations.delete(thread_id)
        if self._repos is not None:
            await self._repos.conversation_index.delete(thread_id)
        return deleted

    async def _drain_background_tasks(self) -> None:
        pending = [task for task in self._background_tasks if not task.done()]
        if not pending:
            return
        logger.info("orchestrator.draining_background_tasks", count=len(pending))
        _, still_pending = await asyncio.wait(pending, timeout=_SHUTDOWN_DRAIN_SECONDS)
        if still_pending:
            logger.warning(
                "orchestrator.background_tasks_drain_timeout", abandoned=len(still_pending)
            )

    async def stop(self) -> None:
        await self._drain_background_tasks()
        if self._mcp_manager is not None:
            await self._mcp_manager.stop()
            logger.info("orchestrator.mcp_sessions_closed")
        if self._pool is not None:
            await self._pool.close()
            logger.info("orchestrator.pool_closed")


class _Repositories:
    """The customer-data repositories the graph and its tools share."""

    def __init__(
        self,
        profile: CustomerProfileRepository,
        memory: CustomerMemoryRepository,
        cart_checkout: CartCheckoutRepository,
        order_tracking: OrderTrackingRepository,
        cart: CartRepository,
        guest_contact: GuestCheckoutContactRepository,
        conversation_index: ConversationIndexRepository,
    ) -> None:
        self.profile = profile
        self.memory = memory
        self.cart_checkout = cart_checkout
        self.order_tracking = order_tracking
        self.cart = cart
        self.guest_contact = guest_contact
        self.conversation_index = conversation_index


def _build_repositories() -> _Repositories:
    sessionmaker = get_sessionmaker()
    redis = get_redis()
    return _Repositories(
        profile=CustomerProfileRepository(sessionmaker, redis),
        memory=CustomerMemoryRepository(sessionmaker, redis),
        cart_checkout=CartCheckoutRepository(sessionmaker, redis),
        order_tracking=OrderTrackingRepository(sessionmaker),
        cart=CartRepository(redis),
        guest_contact=GuestCheckoutContactRepository(redis),
        conversation_index=ConversationIndexRepository(sessionmaker),
    )
