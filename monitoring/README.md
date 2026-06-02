# Monitoring

Prometheus (metrics) + Grafana (dashboards) + Loki/Promtail (logs) for the
KakilleAI stack, wired into the root `docker-compose.yml`.

## Run

```bash
docker compose up -d --build
```

The app services need rebuilding (they gained a `/metrics` endpoint); the
monitoring containers start alongside them.

## Access

| Service    | URL                   | Notes                                                                        |
| ---------- | --------------------- | ---------------------------------------------------------------------------- |
| Grafana    | http://localhost:3001 | admin / ${GF_SECURITY_ADMIN_PASSWORD:-please-change-me} (anonymous disabled) |
| Prometheus | http://localhost:9090 | check Status → Targets                                                       |
| Loki       | http://localhost:3100 | queried via Grafana                                                          |

Grafana auto-provisions the Prometheus + Loki datasources and the
**KakilleAI Overview** dashboard (targets up, message rates, memory, logs).
Grafana also opens the KakilleAI dashboard by default when you land on the home page.

## What's scraped

| Target                          | Source                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `whatsapp-gateway:3000/metrics` | NestJS (prom-client): default Node metrics + `whatsapp_incoming_messages_total`, `whatsapp_outgoing_messages_total` |
| `backend-service:8001/metrics`  | FastAPI (instrumentator): default HTTP metrics                                                                      |
| `nats-exporter:7777`            | NATS monitoring (`:8222`)                                                                                           |
| `postgres-exporter:9187`        | Postgres                                                                                                            |
| `redis-exporter:9121`           | Redis                                                                                                               |

## Logs

Promtail discovers every container via the Docker socket and ships logs to Loki,
labeled by `container`, `service`, and `stream`. Query in Grafana → Explore →
Loki, e.g. `{service="backend-service"}` or `{service="whatsapp-gateway"}`.

Both app services log JSON in production, so log lines parse cleanly in Loki.
No PII (phone numbers, message bodies) is logged.
The WhatsApp gateway writes logs to stdout in production; it does not need a
local `logs/` directory inside the container.
The default dashboard now includes separate log panels for WhatsApp Gateway and
Backend Service.

## Config

- `prometheus/prometheus.yml` — scrape targets
- `grafana/provisioning/` — datasources + dashboard provider
- `grafana/dashboards/` — dashboard JSON
- `loki/loki-config.yml`, `promtail/promtail-config.yml`
