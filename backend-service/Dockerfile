# Pinned uv provides reproducible dependency resolution and a fast installer.
FROM ghcr.io/astral-sh/uv:0.5-python3.12-bookworm-slim AS base

WORKDIR /usr/src/app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

FROM base AS deps

# Install only dependencies first so the layer caches across source changes.
COPY pyproject.toml uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project --no-dev

FROM deps AS build

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev

FROM python:3.12-slim-bookworm AS runtime

WORKDIR /usr/src/app

ENV PATH="/usr/src/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN groupadd --system app && useradd --system --gid app app

COPY --from=build /usr/src/app/.venv ./.venv
COPY --from=build /usr/src/app/app ./app
COPY --from=build /usr/src/app/alembic ./alembic
COPY --from=build /usr/src/app/alembic.ini ./alembic.ini

USER app

EXPOSE 8000

# Apply pending migrations before serving so the schema is always current.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
