# syntax=docker/dockerfile:1

# ─── Builder: compile a static binary ───────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/core-service ./cmd/core-service

# ─── Runtime: distroless static, non-root ───────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

COPY --from=builder /out/core-service /core-service

EXPOSE 8002
USER nonroot:nonroot
ENTRYPOINT ["/core-service"]
