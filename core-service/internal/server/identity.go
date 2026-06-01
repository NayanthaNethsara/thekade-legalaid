package server

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const authTimestampSkew = 30 * time.Second

// Caller is the identity the Next.js edge signs onto each proxied request.
type Caller struct {
	UserID string
	Role   string
}

func (c Caller) IsAdmin() bool { return c.Role == "ADMIN" }

type callerContextKey struct{}

func extractCaller(r *http.Request) Caller {
	return Caller{
		UserID: r.Header.Get("X-User-ID"),
		Role:   r.Header.Get("X-User-Role"),
	}
}

func withCaller(ctx context.Context, caller Caller) context.Context {
	return context.WithValue(ctx, callerContextKey{}, caller)
}

// CallerFrom returns the Caller placed on the context by the edge-auth
// middleware. The zero value means unauthenticated.
func CallerFrom(ctx context.Context) Caller {
	caller, _ := ctx.Value(callerContextKey{}).(Caller)
	return caller
}

// nonceChecker records request nonces to reject replays. A nil checker disables
// the replay layer.
type nonceChecker interface {
	FirstUse(ctx context.Context, nonce string, ttl time.Duration) (bool, error)
}

func verifySignature(r *http.Request, secret string, caller Caller, nonce string) error {
	if secret == "" {
		return errors.New("internal auth secret not configured")
	}

	timestamp := r.Header.Get("X-Auth-Timestamp")
	signature := r.Header.Get("X-Auth-Signature")
	if timestamp == "" || signature == "" {
		return errors.New("missing auth headers")
	}

	seconds, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return errors.New("malformed timestamp")
	}
	if drift := time.Since(time.Unix(seconds, 0)); drift > authTimestampSkew || drift < -authTimestampSkew {
		return errors.New("stale timestamp")
	}

	canonical := strings.Join([]string{r.Method, r.URL.Path, caller.UserID, caller.Role, timestamp, nonce}, "\n")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(canonical))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return errors.New("signature mismatch")
	}
	return nil
}

type edgeAuth struct {
	secret string
	nonces nonceChecker
	log    *slog.Logger
}

// require rejects any request not signed by the edge, replayed, or (when
// requireUser is set) lacking a verified user id.
func (e edgeAuth) require(requireUser bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller := extractCaller(r)
		nonce := r.Header.Get("X-Auth-Nonce")
		if err := verifySignature(r, e.secret, caller, nonce); err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid internal signature"})
			return
		}
		if requireUser && caller.UserID == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing identity headers"})
			return
		}
		if e.nonces != nil && nonce != "" {
			// Fail open on a Redis hiccup: the signature and timestamp still hold.
			if fresh, err := e.nonces.FirstUse(r.Context(), nonce, 2*authTimestampSkew); err != nil {
				e.log.Warn("replay check unavailable", "error", err)
			} else if !fresh {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "replayed request"})
				return
			}
		}
		next.ServeHTTP(w, r.WithContext(withCaller(r.Context(), caller)))
	})
}
