// Package worker consumes inbound WhatsApp messages from NATS and resolves the
// sender to a platform user (provisioning one on first contact) before the
// message is processed further.
package worker

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/nats-io/nats.go"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/identity"
)

// incomingMessage mirrors the whatsapp-gateway IncomingWhatsAppMessageDto. Only
// the fields this worker needs are declared.
type incomingMessage struct {
	MessageID string `json:"messageId"`
	From      string `json:"from"`
	Content   string `json:"content"`
}

type Worker struct {
	matcher *identity.Matcher
	logger  *slog.Logger
}

func New(matcher *identity.Matcher, logger *slog.Logger) *Worker {
	return &Worker{matcher: matcher, logger: logger}
}

// Subscribe binds the inbound-text handler to the given subject. The returned
// subscription should be drained/unsubscribed on shutdown.
func (w *Worker) Subscribe(nc *nats.Conn, subject string) (*nats.Subscription, error) {
	return nc.Subscribe(subject, w.handle)
}

func (w *Worker) handle(msg *nats.Msg) {
	var in incomingMessage
	if err := json.Unmarshal(msg.Data, &in); err != nil {
		w.logger.Error("worker: malformed incoming message", "error", err)
		return
	}
	if in.From == "" {
		w.logger.Warn("worker: incoming message missing sender", "message_id", in.MessageID)
		return
	}

	user, err := w.matcher.MatchOrRegister(context.Background(), in.From)
	if err != nil {
		w.logger.Error("worker: identity resolution failed",
			"error", err, "phone", in.From, "message_id", in.MessageID)
		return
	}

	w.logger.Info("worker: resolved sender",
		"user_id", user.ID, "role", user.Role, "message_id", in.MessageID)

	// The resolved user now travels with the message into the agent pipeline.
}
