// Package otp generates, persists, and dispatches the one-time codes used by
// the passwordless WhatsApp login flow. Verification happens at the Next.js
// edge against the same verification_tokens rows written here.
package otp

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/db/sqlc"
)

const (
	codeTTL    = 5 * time.Minute
	otpMessage = "Your LegalAid verification code is %s. It expires in 5 minutes."
)

// outgoingText mirrors the whatsapp-gateway OutgoingTextMessageDto so the
// gateway can relay the message without translation.
type outgoingText struct {
	To      string `json:"to"`
	Type    string `json:"type"`
	Content struct {
		Text string `json:"text"`
	} `json:"content"`
}

type Service struct {
	queries         *sqlc.Queries
	nc              *nats.Conn
	outgoingSubject string
}

func NewService(pool *pgxpool.Pool, nc *nats.Conn, outgoingSubject string) *Service {
	return &Service{queries: sqlc.New(pool), nc: nc, outgoingSubject: outgoingSubject}
}

// Send generates a fresh 6-digit code, replaces any outstanding codes for the
// phone, persists it with a 5-minute expiry, and queues a WhatsApp message.
func (s *Service) Send(ctx context.Context, phone string) error {
	code, err := generateCode()
	if err != nil {
		return fmt.Errorf("otp: generate: %w", err)
	}

	// One live code per phone: clear prior codes before inserting the new one.
	if err := s.queries.ClearOTPTokens(ctx, phone); err != nil {
		return fmt.Errorf("otp: clear prior codes: %w", err)
	}
	if err := s.queries.StoreOTPToken(ctx, sqlc.StoreOTPTokenParams{
		Identifier: phone,
		Token:      code,
		Expires:    pgtype.Timestamptz{Time: time.Now().Add(codeTTL), Valid: true},
	}); err != nil {
		return fmt.Errorf("otp: persist code: %w", err)
	}

	return s.dispatch(phone, code)
}

// Verify consumes a code for the phone, returning false when it is wrong or
// expired. The matching row is deleted atomically (DELETE ... single-use), so
// a replayed code cannot succeed twice; any other live codes for the phone are
// cleared on success.
func (s *Service) Verify(ctx context.Context, phone, code string) (bool, error) {
	affected, err := s.queries.VerifyOTPToken(ctx, sqlc.VerifyOTPTokenParams{
		Identifier: phone,
		Token:      code,
	})
	if err != nil {
		return false, fmt.Errorf("otp: verify: %w", err)
	}
	if affected == 0 {
		return false, nil
	}

	if err := s.queries.ClearOTPTokens(ctx, phone); err != nil {
		return false, fmt.Errorf("otp: clear consumed codes: %w", err)
	}
	return true, nil
}

func (s *Service) dispatch(phone, code string) error {
	var msg outgoingText
	msg.To = phone
	msg.Type = "text"
	msg.Content.Text = fmt.Sprintf(otpMessage, code)

	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("otp: marshal message: %w", err)
	}
	if err := s.nc.Publish(s.outgoingSubject, payload); err != nil {
		return fmt.Errorf("otp: publish message: %w", err)
	}
	return nil
}

// generateCode returns a uniformly random zero-padded 6-digit string using a
// cryptographically secure source.
func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
