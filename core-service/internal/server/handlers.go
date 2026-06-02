package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/identity"
)

// OTPService generates, dispatches, and verifies one-time codes. Implemented by
// otp.Service; kept as an interface so the server package does not depend on
// the database or NATS directly.
type OTPService interface {
	Send(ctx context.Context, phone string) error
	Verify(ctx context.Context, phone, code string) (bool, error)
}

// IdentityResolver resolves a phone number to a platform user, provisioning one
// on first contact. Implemented by identity.Matcher and shared with the
// WhatsApp worker so web and WhatsApp logins follow one code path.
type IdentityResolver interface {
	MatchOrRegister(ctx context.Context, phone string) (identity.User, error)
}

type apiHandlers struct {
	logger   *slog.Logger
	otp      OTPService
	identity IdentityResolver
}

type sendOTPRequest struct {
	Phone string `json:"phone"`
}

// sendOTP generates and dispatches a 6-digit code. This endpoint is triggered
// by the Next.js login flow (step 1) and is unauthenticated by design — the
// user has no session yet.
func (h *apiHandlers) sendOTP(w http.ResponseWriter, r *http.Request) {
	var req sendOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Phone == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "phone is required"})
		return
	}

	if err := h.otp.Send(r.Context(), req.Phone); err != nil {
		h.logger.Error("failed to send OTP", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to send code"})
		return
	}

	// Do not leak the code: the gateway delivers it over WhatsApp.
	writeJSON(w, http.StatusAccepted, map[string]bool{"sent": true})
}

type verifyOTPRequest struct {
	Phone string `json:"phone"`
	OTP   string `json:"otp"`
}

// verifyOTP is login step 2: it validates the code and resolves (or silently
// provisions) the user, returning the identity Next.js bakes into the session
// JWT. Unauthenticated by design — this is what establishes the session. The
// core-service owns user management; Next.js only mints the cookie.
func (h *apiHandlers) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var req verifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Phone == "" || len(req.OTP) != 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "phone and 6-digit otp are required"})
		return
	}

	valid, err := h.otp.Verify(r.Context(), req.Phone, req.OTP)
	if err != nil {
		h.logger.Error("failed to verify OTP", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "verification failed"})
		return
	}
	if !valid {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired code"})
		return
	}

	user, err := h.identity.MatchOrRegister(r.Context(), req.Phone)
	if err != nil {
		h.logger.Error("failed to resolve identity", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not resolve user"})
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// chat handles authenticated web chat. Identity arrives via trusted headers
// already validated by requireCaller; here we read it back off the context.
func (h *apiHandlers) chat(w http.ResponseWriter, r *http.Request) {
	caller := CallerFrom(r.Context())

	var payload json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	h.logger.Info("chat request", "user_id", caller.UserID, "role", caller.Role)

	// Boilerplate echo until the agent pipeline is wired in; the auth contract
	// (trusted identity on the request) is what this layer establishes.
	writeJSON(w, http.StatusOK, map[string]any{
		"user_id": caller.UserID,
		"role":    caller.Role,
		"reply":   "core-service received your message",
	})
}
