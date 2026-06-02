# Plan: Consolidate into `backend-service` (Python + LangGraph)

Move all AI orchestration, auth, and messaging into a single Python service built
around a LangGraph multi-agent graph. Park the Go `core-service` (keep the code,
remove it from the active path). Rebuild the database from a clean slate with
Alembic as the sole schema owner.

## Decisions (locked)

- **Single backend**: rename `admin-service` to `backend-service`; it owns RAG,
  auth/OTP/identity, NATS WhatsApp I/O, web chat, and the agent orchestrator.
- **Orchestrator**: LangGraph multi-agent graph (planner, research, RAG, tools,
  replanning loop). No separate orchestrator service.
- **LLM**: behind an interface so the provider can be swapped later without graph
  changes. Gemini is the natural first choice (embeddings already use it).
- **Tools**: in-process registry. `rag_search` is real (calls RAG in-process);
  `web_search`, `schedule_meeting`, `reminder` are registered stubs for now.
- **State**: Redis for short-lived session state; Postgres LangGraph checkpointer
  for durable conversation history and replay; a durable table for guardrail
  audit records.
- **core-service**: kept in the repo but disconnected (NATS subscription stopped,
  removed from the compose run set). No source deleted.
- **Database**: clean rebuild. No data to preserve. Alembic becomes the sole
  owner of the entire schema (`auth.*` and `public.*`).

## Target topology

```
  WhatsApp ─► whatsapp-gateway (Node) ─┐
                                       │ NATS  whatsapp.incoming.text / whatsapp.outgoing
  Web (Next.js edge, HMAC-signed) ─────┤ HTTP  /api/otp/*, /api/chat
                                       ▼
                        backend-service (Python / FastAPI, :8001)
                          auth (identity, OTP, edge-auth)
                          messaging (NATS consume + publish)
                          orchestrator (LangGraph graph)
                          services (RAG, Gemini embeddings)
                                       │
                          Postgres/pgvector + Redis
```

## Orchestrator graph

```
input_guardrail → planner → router ⟲ {rag_agent, research_agent, tool_executor}
                                   → replan → synthesizer → output_guardrail
```

- `replan` loops back to `router` until the plan is satisfied or a max-iteration
  cap trips (the cycle always terminates).
- Guardrails are fail-closed; a blocked non-critical tool takes a safe fallback
  branch instead of aborting the turn.
- Both transports (HTTP chat, NATS WhatsApp) build the same request and call the
  same graph.

## Build order

### 1. Rename and scaffold
- `admin-service/` → `backend-service/`. Update Dockerfile, `docker-compose.yml`
  service name, `start-dev.sh`, `monitoring/prometheus` scrape target, and the
  FastAPI title.
- New packages under `backend-service/app/`: `auth/`, `messaging/`,
  `orchestrator/`. Keep existing `services/`, `api/`, `models/`, `repositories/`.

### 2. Clean database rebuild, Alembic as sole owner
- Drop the database (or drop all schemas / reset the Postgres volume). No data
  migration.
- Add SQLAlchemy models for `auth.users`, `auth.accounts`,
  `auth.verification_tokens` with `__table_args__ = {"schema": "auth"}`, matching
  the original `001_auth_schema.sql`.
- Configure Alembic `env.py` with `include_schemas=True`.
- Add revision `0002_auth_schema` (down_revision `0001_initial_rag_schema`) that
  runs `CREATE SCHEMA auth` and creates the three auth tables and their indexes.
- Provision the clean DB with `alembic upgrade head` (RAG schema + auth schema).
- Remove the Go embedded migrations from the startup path (core-service is parked).

### 3. Port edge-auth caller
- Extend `app/core/security.py`: add a `Caller(user_id, role)` dependency from
  `X-User-ID` / `X-User-Role`, and a `require_user` dependency (valid signature +
  non-empty user id), mirroring Go's `edgeAuth.require(true, ...)`. The HMAC
  verification and Redis nonce check already exist and are unchanged.

### 4. Port identity and OTP
- `auth/identity.py`: `match_or_register(db, phone)` — look up
  `(provider='whatsapp', provider_account_id=phone)`; if absent, insert user
  (`usr_` + uuid hex, role `USER`) plus linked account in one transaction.
- `auth/otp.py`: `send(phone)` (generate 6-digit code, clear prior codes, store
  with 5-minute TTL, publish the WhatsApp message over NATS) and
  `verify(phone, code)` (single-use delete-if-unexpired).

### 5. NATS integration (new dependency: `nats-py`)
- `messaging/nats.py`: async connect with reconnect, a publisher for
  `whatsapp.outgoing`, and a subscriber on `whatsapp.incoming.text`. Start/stop in
  the FastAPI lifespan.
- DTOs: incoming `{messageId, from, text}`; outgoing
  `{to, type:"text", content:{text}}`.
- Concurrency: existing RAG/DB code is sync SQLAlchemy; the NATS handler is async.
  First cut wraps sync DB work in `asyncio.to_thread`. Async SQLAlchemy is a later
  option.

### 6. LangGraph orchestrator
- New deps: `langgraph`, `langchain-google-genai`, `langgraph-checkpoint-postgres`.
- State: messages, caller identity, channel, plan, retrieved context, tool
  results, iteration count.
- Tools (registry, easy to extend): `rag_search` (in-process call to
  `services/rag.search`), plus `web_search`, `schedule_meeting`, `reminder` as
  registered stubs returning "not implemented yet".
- Guardrails: input validation, policy/safety, tool allowlist (role/channel
  aware), output safety — fail-closed with a safe fallback branch.
- State stores: Redis (short-lived session), Postgres checkpointer (thread =
  conversation id), durable audit table for guardrail decisions.
- LLM behind an interface; one Gemini adapter now, swappable later.

### 7. Entrypoints (thin adapters to one orchestrator)
- `POST /api/chat` (require_user) → `orchestrator.handle(channel=web)`.
- `POST /api/otp/send`, `POST /api/otp/verify` (signature only) → OTP service.
- NATS `whatsapp.incoming.text` → resolve identity →
  `orchestrator.handle(channel=whatsapp)` → publish reply.

### 8. Park core-service
- Remove its NATS subscription and remove/disable it in `docker-compose.yml` (stop
  it running). Leave the Go source intact with a short note that it is parked.

### 9. Deployment and frontend wiring
- `docker-compose.yml`: backend-service gains `NATS_URL`,
  `NATS_SUBJECT_INCOMING_TEXT`, `NATS_SUBJECT_OUTGOING`, and a Gemini chat model
  setting; keeps `INTERNAL_AUTH_SECRET` / `REDIS_URL` / `DATABASE_URL`. Drop
  core-service from the run set.
- Point the frontend internal base URL for otp/chat at backend-service (:8001).
- Add `nats-py`, `langgraph`, `langchain-google-genai`,
  `langgraph-checkpoint-postgres` to requirements.

### 10. Tests
- Unit: graph decision matrix, guardrail combinations, fallback, tool selection
  (fake LLM and fakes).
- Component: OTP send/verify and identity match-or-register against a test DB.
- Integration: `/api/chat` HTTP, and NATS inbound → orchestrator → outbound round
  trip.

## Risks managed (not blocking)

- **Sync vs async DB**: handled via `asyncio.to_thread` initially; async
  SQLAlchemy is a follow-up.
- **Clean-slate cutover**: acceptable because no data is preserved; Alembic owns
  the full schema from a fresh `upgrade head`.
- **Single migration owner**: after this lands, Alembic is the sole owner of all
  tables; Go migrations no longer run.
