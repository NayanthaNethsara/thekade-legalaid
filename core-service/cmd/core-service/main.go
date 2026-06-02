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

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/config"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/db"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/identity"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/messaging"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/otp"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/replay"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/server"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/worker"
	"github.com/NayanthaNethsara/thekade-legalaid/core-service/migrations"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()
	logger.Info("starting core-service", "env", cfg.Env, "port", cfg.Port)

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to Postgres", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Apply the auth schema before anything depends on it. core-service owns
	// these tables; run on a single pooled connection.
	if err := runMigrations(context.Background(), logger, pool); err != nil {
		logger.Error("failed to apply migrations", "error", err)
		os.Exit(1)
	}

	nc, err := messaging.Connect(cfg.NATSURL, logger)
	if err != nil {
		logger.Error("failed to initialize NATS connection", "error", err)
		os.Exit(1)
	}
	defer nc.Drain() //nolint:errcheck // best-effort flush on shutdown

	nonceStore, err := replay.NewStore(cfg.RedisURL)
	if err != nil {
		logger.Error("failed to configure replay store", "error", err)
		os.Exit(1)
	}
	defer nonceStore.Close() //nolint:errcheck // best-effort on shutdown

	otpService := otp.NewService(pool, nc, cfg.OutgoingSubject)

	matcher := identity.NewMatcher(pool)
	inboundWorker := worker.New(matcher, nc, cfg.OutgoingSubject, logger)
	sub, err := inboundWorker.Subscribe(cfg.IncomingTextSubject)
	if err != nil {
		logger.Error("failed to subscribe to incoming messages", "error", err)
		os.Exit(1)
	}
	defer sub.Unsubscribe() //nolint:errcheck // best-effort on shutdown

	srv := server.New(":"+cfg.Port, logger, otpService, matcher, cfg.InternalAuthSecret, nonceStore,
		server.ReadinessCheck{
			Name: "nats",
			Probe: func(context.Context) error {
				if !nc.IsConnected() {
					return errors.New("not connected")
				}
				return nil
			},
		},
		server.ReadinessCheck{
			Name:  "postgres",
			Probe: pool.Ping,
		},
	)

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

// runMigrations applies the embedded auth schema using one connection borrowed
// from the pool, matching migrations.Run's single-connection contract.
func runMigrations(ctx context.Context, logger *slog.Logger, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	return migrations.Run(ctx, logger, conn.Conn())
}
