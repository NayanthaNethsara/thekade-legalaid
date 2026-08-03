# Kakille AI

**Status:** Under construction

Kakille AI is a conversational AI assistant reachable over WhatsApp and the web.

## Components

| Path                                     | What it is                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| [backend-service/](backend-service/)     | FastAPI + LangGraph orchestrator. Owns Postgres, Redis, the auth API, the NATS worker, and the first-party MCP server (`app/mcp_server`). |
| [kakille-web/](kakille-web/)             | Next.js (App Router) web chat client, NextAuth sessions plus guest mode.                   |
| [whatsapp-gateway/](whatsapp-gateway/)   | NestJS gateway. Normalizes WhatsApp Cloud API traffic onto the NATS contract.              |
| [observability/](observability/)         | Prometheus, Loki, Promtail, Grafana provisioning.                                          |
| [docker-compose.yml](docker-compose.yml) | Local stack: Postgres, Redis, NATS, pgweb.                                                 |

## Local development

```bash
docker compose up -d --build     # Postgres, Redis, NATS, backend, gateway
cd kakille-web && pnpm install && pnpm dev
```

Backend tooling runs through the project virtualenv (`backend-service/.venv/bin`),
not a global `uv`.

Copy `backend-service/.env.example` and `whatsapp-gateway/.env.example` to
`.env` before starting. `MCP_URL` points at a placeholder host — leave it blank
to run text-only without external tools.

## Where to start

- [docs/README.md](docs/README.md) — documentation index.
- [AGENTS.md](AGENTS.md) — engineering conventions for this repository.
