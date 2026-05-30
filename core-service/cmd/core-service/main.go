package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/config"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/messaging"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()
	logger.Info("starting core-service", "env", cfg.Env, "port", cfg.Port)

	nc, err := messaging.Connect(cfg.NATSURL, logger)
	if err != nil {
		logger.Error("failed to initialize NATS connection", "error", err)
		os.Exit(1)
	}
	defer nc.Drain() //nolint:errcheck // best-effort flush on shutdown

	srv := server.New(":"+cfg.Port, logger, server.ReadinessCheck{
		Name: "nats",
		Probe: func(context.Context) error {
			if !nc.IsConnected() {
				return errors.New("not connected")
			}
			return nil
		},
	})

	go func() {
		logger.Info("HTTP server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("HTTP server error", "error", err)
			os.Exit(1)
		}
	}()

	// Block until an interrupt/termination signal arrives.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("HTTP server shutdown error", "error", err)
	}
	logger.Info("stopped")
}
