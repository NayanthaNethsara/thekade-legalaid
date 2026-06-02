// Package worker consumes inbound WhatsApp text messages from NATS, resolves
// the sender to a platform user (provisioning one on first contact), and sends
// a reply back through the outgoing queue.
package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/identity"
)

// identityTimeout bounds the per-message identity lookup so a slow database
// cannot stall the NATS handler indefinitely.
const identityTimeout = 5 * time.Second

// incomingText mirrors the whatsapp-gateway IncomingTextMessageDto. Only the
// fields this worker needs are declared.
type incomingText struct {
	MessageID string `json:"messageId"`
	From      string `json:"from"`
	Text      string `json:"text"`
}

// outgoingText mirrors the whatsapp-gateway OutgoingTextMessageDto so the
// gateway can relay the reply without translation.
type outgoingText struct {
	To      string `json:"to"`
	Type    string `json:"type"`
	Content struct {
		Text string `json:"text"`
	} `json:"content"`
}

type Worker struct {
	matcher         *identity.Matcher
	nc              *nats.Conn
	outgoingSubject string
	logger          *slog.Logger
}

func New(matcher *identity.Matcher, nc *nats.Conn, outgoingSubject string, logger *slog.Logger) *Worker {
	return &Worker{
		matcher:         matcher,
		nc:              nc,
		outgoingSubject: outgoingSubject,
		logger:          logger,
	}
}

// Subscribe binds the inbound-text handler to the given subject. The returned
// subscription should be drained/unsubscribed on shutdown.
func (w *Worker) Subscribe(subject string) (*nats.Subscription, error) {
	sub, err := w.nc.Subscribe(subject, w.handle)
	if err != nil {
		return nil, fmt.Errorf("worker: subscribe %q: %w", subject, err)
	}
	w.logger.Info("worker: subscribed to incoming text",
		"incoming_subject", subject, "outgoing_subject", w.outgoingSubject)
	return sub, nil
}

func (w *Worker) handle(msg *nats.Msg) {
	var in incomingText
	if err := json.Unmarshal(msg.Data, &in); err != nil {
		// Do not log the raw payload; it carries the sender and message body.
		w.logger.Error("worker: malformed incoming message", "error", err)
		return
	}
	if in.From == "" {
		w.logger.Warn("worker: incoming message missing sender",
			"message_id", in.MessageID)
		return
	}

	// Never log the sender number or message body (PII). text_len gives a signal
	// that content arrived without exposing it.
	w.logger.Info("worker: incoming text",
		"message_id", in.MessageID, "text_len", len(in.Text))

	ctx, cancel := context.WithTimeout(context.Background(), identityTimeout)
	defer cancel()

	user, err := w.matcher.MatchOrRegister(ctx, in.From)
	if err != nil {
		w.logger.Error("worker: identity resolution failed",
			"error", err, "message_id", in.MessageID)
		return
	}

	w.logger.Info("worker: resolved sender",
		"user_id", user.ID, "role", user.Role, "message_id", in.MessageID)

	// Placeholder reply until the agent pipeline is wired in: echo the message
	// back so the incoming -> outgoing round trip is verifiable end to end.
	if err := w.reply(in.From, fmt.Sprintf("Received: %s", in.Text)); err != nil {
		w.logger.Error("worker: failed to send reply",
			"error", err, "message_id", in.MessageID)
		return
	}

	w.logger.Info("worker: reply published",
		"subject", w.outgoingSubject, "message_id", in.MessageID)
}

// reply publishes a text message to the outgoing subject for the gateway to
// deliver to the user.
func (w *Worker) reply(to, text string) error {
	var out outgoingText
	out.To = to
	out.Type = "text"
	out.Content.Text = text

	payload, err := json.Marshal(out)
	if err != nil {
		return fmt.Errorf("worker: marshal reply: %w", err)
	}
	if err := w.nc.Publish(w.outgoingSubject, payload); err != nil {
		return fmt.Errorf("worker: publish reply: %w", err)
	}
	return nil
}
