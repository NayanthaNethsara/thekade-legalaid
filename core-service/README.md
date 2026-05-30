# core-service

kakilleAI **LLM & agent orchestration** service (Go).

> Status: **skeleton** — connects to NATS and serves a health endpoint. Agent
> frameworks and REST orchestration routes are added on top of this.

## Planned building blocks

- **Agent framework** — one of [Google ADK (Go)](https://google.github.io/adk-docs/),
  [Genkit](https://genkit.dev), or [LangChainGo](https://github.com/tmc/langchaingo)
  for state, memory, and tool execution (TBD).
- **NATS** — consumes/produces events on the shared event bus.
- **REST API** — orchestration endpoints (to be added).

## Layout

```
core-service/
├── cmd/core-service/main.go   # entrypoint: config → NATS → HTTP → graceful shutdown
└── internal/
    ├── config/                # env-based configuration
    ├── messaging/             # NATS connection (subscriptions added later)
    └── server/                # HTTP server + routes (/health)
```

## Configuration

| Env var    | Default                  | Description           |
| ---------- | ------------------------ | --------------------- |
| `ENV`      | `development`            | Deployment environment|
| `PORT`     | `8002`                   | HTTP listen port      |
| `NATS_URL` | `nats://localhost:4222`  | NATS server URL       |

## Run locally

```bash
go run ./cmd/core-service        # or: make run
# http://localhost:8002/health
```

## Development

Formatter is `gofumpt` + `goimports`; linter is `golangci-lint` (config in
`.golangci.yml`).

```bash
make tools   # install gofumpt + golangci-lint (one-time)
make fmt     # format
make lint    # lint
make build   # compile to bin/core-service
```

## Docker

```bash
# from the repo root
docker compose up -d --build core-service
```
