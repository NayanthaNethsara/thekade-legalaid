# Kakille AI Backend Service

FastAPI service and LangGraph orchestrator. Serves the web chat API, consumes
WhatsApp events from NATS JetStream, and publishes replies for the
`whatsapp-gateway` to deliver.

All prompt text in `app/orchestrator/prompts.py` is generic placeholder content;
see the module docstring there before editing it.

## Role in the system

```
WhatsApp -> whatsapp-gateway -> NATS (whatsapp.incoming.*) -> backend-service
backend-service -> NATS (whatsapp.outgoing) -> whatsapp-gateway -> WhatsApp
```

The service binds durable JetStream consumers to the incoming subjects, so it can
restart without losing messages. Failed handlers nak for redelivery; malformed
payloads are terminated.

## Structure

```
app/
  main.py                    FastAPI app + lifespan that runs the NATS worker
  mcp_server/main.py         first-party MCP server (legal knowledge search)
  core/
    config.py                Settings (pydantic-settings), grouped by concern
    logging.py               structlog JSON logging
  api/routes/health.py       liveness (/health) and readiness (/ready) probes
  messaging/
    nats_client.py           connection + JetStream lifecycle
    consumer.py              durable subscriptions -> handler dispatch
    publisher.py             outgoing message publishing
    schemas.py               Pydantic models mirroring the gateway contract
  handlers/
    agent.py                 WhatsApp adapter for the orchestrator
    whatsapp_messages.py     reply + cards -> outgoing WhatsApp messages
    whatsapp_registration.py auto-registers inbound WhatsApp senders
  orchestrator/
    service.py               lifecycle singleton; respond() entry point
    graph.py                 LangGraph wiring (nodes, edges, routing)
    state.py                 AgentState shared by all nodes
    turns.py                 message-history helpers (message_text, current turn)
    products.py              search JSON -> markdown + product cards/actions
    order_sync.py            order tool output -> customer order records
    nodes/                   guard, summarize, load/write memory, plan,
                             execute, reason, format_response
```

Further docs: [docs/whatsapp-messaging.md](docs/whatsapp-messaging.md) (how
replies become WhatsApp messages), [docs/guardrail.md](docs/guardrail.md),
[docs/memory.md](docs/memory.md).

## Extending

Replace `EchoHandler` (or add new handlers) under `app/handlers/` with real
processing. The handler receives a validated `IncomingMessage` and uses the
`OutgoingPublisher` to reply; nothing else needs to change.

## Local development

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

The MCP server runs as its own process (see below); start it first, or leave
`MCP_URL` blank to run without legal knowledge search.

```bash
uv run uvicorn app.mcp_server.main:app --port 8010
```

Run checks:

```bash
uv run ruff check .
uv run mypy app
```

## Docker

Built and orchestrated from the repo-root `docker-compose.yml` as the
`backend-service` service. The multi-stage `Dockerfile` installs dependencies
with `uv`, then ships a slim runtime image running as a non-root user.
