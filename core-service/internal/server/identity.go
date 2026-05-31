package server

import (
	"context"
	"net/http"
)

// Caller is the identity Next.js stamps onto every proxied request. The
// core-service trusts these headers implicitly: only the Next.js edge, inside
// the network perimeter, can reach these endpoints, and it is the sole
// authority that validates web sessions.
type Caller struct {
	UserID string
	Role   string
}

func (c Caller) IsAdmin() bool { return c.Role == "ADMIN" }

type callerContextKey struct{}

// extractCaller reads the trusted X-User-ID / X-User-Role headers into a Caller.
func extractCaller(r *http.Request) Caller {
	return Caller{
		UserID: r.Header.Get("X-User-ID"),
		Role:   r.Header.Get("X-User-Role"),
	}
}

// withCaller stores the extracted Caller on the request context so downstream
// handlers read identity without re-parsing headers.
func withCaller(ctx context.Context, caller Caller) context.Context {
	return context.WithValue(ctx, callerContextKey{}, caller)
}

// CallerFrom returns the Caller previously placed on the context by the
// identity middleware. The zero value (empty id/role) means unauthenticated.
func CallerFrom(ctx context.Context) Caller {
	caller, _ := ctx.Value(callerContextKey{}).(Caller)
	return caller
}

// requireCaller is HTTP middleware that extracts the trusted identity headers
// and rejects requests that arrive without a user id — a request that reached
// here without one bypassed the Next.js proxy and is not trusted.
func requireCaller(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller := extractCaller(r)
		if caller.UserID == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "missing identity headers",
			})
			return
		}
		next.ServeHTTP(w, r.WithContext(withCaller(r.Context(), caller)))
	})
}
