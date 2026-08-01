# Kakille AI Documentation

Project documentation index. Kakille AI is a conversational assistant reachable
over WhatsApp and the web.

The codebase started as a working commerce agent, so the orchestrator still
ships cart, checkout, and order-tracking tools. They are wired up and running;
the prompt content around them is generic placeholder text pending the real
domain. See `backend-service/app/orchestrator/prompts.py`.

## Components

- `backend-service/` — FastAPI service. Consumes WhatsApp events from NATS,
  owns the user store (Postgres) and guest sessions (Redis), and exposes the
  auth API. Credential authority for the whole system.
- `kakille-web/` — Next.js 16 (App Router) web app. Uses NextAuth (Auth.js v5)
  for sessions over the backend auth API, plus an anonymous guest mode.
- `whatsapp-gateway/` — normalizes WhatsApp messages onto the NATS contract.
- Infra (`docker-compose.yml`): Postgres, Redis, NATS, pgweb.

## Documents

- [Backend API requirements](backend-api-requirements.md) — every kakille-web
  button/panel mapped to its backend endpoint, and the endpoints still needed
  for the NotebookLM-style Sources/Notes/Reminders/Studio panels.
- [Memory](../backend-service/docs/memory.md) — the three state and memory tiers
  the orchestrator uses, and their lifecycles.
- [Domain knowledge prompt](../backend-service/docs/domain-knowledge-prompt.md) —
  the taxonomy the search agent and the scope guardrail are grounded in.
- [WhatsApp messaging](../backend-service/docs/whatsapp-messaging.md) — how a
  reply plus its cards become outgoing WhatsApp messages.
- `whatsapp-gateway/docs/` — the webhook and NATS queue contracts.

## Local development

Bring up the stack:

```bash
docker compose up -d --build
```

Run the web app (from `kakille-web/`):

```bash
pnpm install
pnpm dev
```

Backend tooling runs through the project virtualenv (`backend-service/.venv/bin`),
not a global `uv`.
