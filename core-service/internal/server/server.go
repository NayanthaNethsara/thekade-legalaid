package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const serviceName = "core-service"

func New(addr string, logger *slog.Logger, otp OTPService, ident IdentityResolver, internalAuthSecret string, nonces nonceChecker, readinessChecks ...ReadinessCheck) *http.Server {
	health := &healthEndpoints{startedAt: time.Now(), checks: readinessChecks}
	api := &apiHandlers{logger: logger, otp: otp, identity: ident}
	edge := edgeAuth{secret: internalAuthSecret, nonces: nonces, log: logger}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health.liveness)
	mux.HandleFunc("GET /readyz", health.readiness)
	mux.HandleFunc("GET /health", health.health)
	mux.Handle("GET /metrics", promhttp.Handler())

	// Pre-session (no user yet) but still edge-only: the signature proves the
	// call came from Next.js, blocking direct abuse of OTP send/verify.
	mux.Handle("POST /api/otp/send", edge.require(false, http.HandlerFunc(api.sendOTP)))
	mux.Handle("POST /api/otp/verify", edge.require(false, http.HandlerFunc(api.verifyOTP)))
	// Authenticated: signature plus a verified user identity from the edge.
	mux.Handle("POST /api/chat", edge.require(true, http.HandlerFunc(api.chat)))

	return &http.Server{
		Addr:              addr,
		Handler:           logRequests(logger, mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip scrape/probe noise from the access log.
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}
		start := time.Now()
		next.ServeHTTP(w, r)
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(start).String(),
		)
	})
}
