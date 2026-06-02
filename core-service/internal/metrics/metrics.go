// Package metrics declares the Prometheus collectors for core-service. They are
// registered on the default registry and exposed via promhttp at /metrics.
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// IncomingMessages counts inbound WhatsApp text messages by processing result
// (handled, malformed, no_sender, identity_failed, reply_failed).
var IncomingMessages = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "core_incoming_messages_total",
		Help: "Incoming WhatsApp text messages handled by core-service, by result.",
	},
	[]string{"result"},
)

// RepliesPublished counts replies successfully published to the outgoing queue.
var RepliesPublished = promauto.NewCounter(
	prometheus.CounterOpts{
		Name: "core_replies_published_total",
		Help: "Replies published to the outgoing WhatsApp queue.",
	},
)
