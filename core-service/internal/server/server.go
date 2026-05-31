package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

const serviceName = "core-service"

func New(addr string, logger *slog.Logger, otp OTPService, ident IdentityResolver, readinessChecks ...ReadinessCheck) *http.Server {
	health := &healthEndpoints{startedAt: time.Now(), checks: readinessChecks}
	api := &apiHandlers{logger: logger, otp: otp, identity: ident}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health.liveness)
	mux.HandleFunc("GET /readyz", health.readiness)
	mux.HandleFunc("GET /health", health.health)

	// Unauthenticated: the user has no session yet during login steps 1 and 2.
	mux.HandleFunc("POST /api/otp/send", api.sendOTP)
	mux.HandleFunc("POST /api/otp/verify", api.verifyOTP)
	// Authenticated via trusted identity headers minted by the Next.js proxy.
	mux.Handle("POST /api/chat", requireCaller(http.HandlerFunc(api.chat)))

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
		start := time.Now()
		next.ServeHTTP(w, r)
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(start).String(),
		)
	})
}
