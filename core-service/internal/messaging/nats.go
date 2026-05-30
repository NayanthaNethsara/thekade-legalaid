package messaging

import (
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
)

func Connect(url string, logger *slog.Logger) (*nats.Conn, error) {
	return nats.Connect(
		url,
		nats.Name("core-service"),
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(2*time.Second),
		nats.ConnectHandler(func(c *nats.Conn) {
			logger.Info("NATS connected", "url", c.ConnectedUrl())
		}),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			logger.Warn("NATS disconnected", "error", err)
		}),
		nats.ReconnectHandler(func(c *nats.Conn) {
			logger.Info("NATS reconnected", "url", c.ConnectedUrl())
		}),
	)
}
