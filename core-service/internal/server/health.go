package server

import (
	"context"
	"net/http"
	"time"
)

const readinessProbeTimeout = 2 * time.Second

// ReadinessCheck probes one dependency; a nil error means ready.
type ReadinessCheck struct {
	Name  string
	Probe func(ctx context.Context) error
}

type healthEndpoints struct {
	startedAt time.Time
	checks    []ReadinessCheck
}

type checkResult struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

// liveness skips dependency probes so a slow dependency never forces a restart.
func (h *healthEndpoints) liveness(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service": serviceName,
		"status":  "alive",
	})
}

func (h *healthEndpoints) readiness(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), readinessProbeTimeout)
	defer cancel()

	results, isReady := h.runProbes(ctx)
	status, label := http.StatusOK, "ready"
	if !isReady {
		status, label = http.StatusServiceUnavailable, "not_ready"
	}

	writeJSON(w, status, map[string]any{
		"service": serviceName,
		"status":  label,
		"checks":  results,
	})
}

func (h *healthEndpoints) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), readinessProbeTimeout)
	defer cancel()

	results, isReady := h.runProbes(ctx)
	status, label := http.StatusOK, "ok"
	if !isReady {
		status, label = http.StatusServiceUnavailable, "degraded"
	}

	writeJSON(w, status, map[string]any{
		"service": serviceName,
		"status":  label,
		"uptime":  time.Since(h.startedAt).Round(time.Second).String(),
		"checks":  results,
	})
}

func (h *healthEndpoints) runProbes(ctx context.Context) (map[string]checkResult, bool) {
	results := make(map[string]checkResult, len(h.checks))
	isReady := true
	for _, check := range h.checks {
		if err := check.Probe(ctx); err != nil {
			results[check.Name] = checkResult{Status: "fail", Error: err.Error()}
			isReady = false
			continue
		}
		results[check.Name] = checkResult{Status: "ok"}
	}
	return results, isReady
}
