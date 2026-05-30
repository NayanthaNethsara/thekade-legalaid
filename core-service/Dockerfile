# syntax=docker/dockerfile:1

# ─── Builder: compile a static binary ───────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Dependencies first (cached unless go.mod/go.sum change).
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/core-service ./cmd/core-service

# ─── Runtime: distroless static, non-root ───────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

COPY --from=builder /out/core-service /core-service

EXPOSE 8002
USER nonroot:nonroot
ENTRYPOINT ["/core-service"]
