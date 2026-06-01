// Package migrations applies the embedded schema to the shared Postgres
// database. The .sql files live alongside this file because go:embed cannot
// reach a parent or sibling directory.
package migrations

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5"
)

//go:embed *.sql
var migrationFiles embed.FS

// Run executes all migration SQL files in lexicographic order. Idempotent;
// all statements use CREATE ... IF NOT EXISTS or similar guards.
func Run(ctx context.Context, logger *slog.Logger, conn *pgx.Conn) error {
	entries, err := migrationFiles.ReadDir(".")
	if err != nil {
		return fmt.Errorf("migrations: read dir: %w", err)
	}

	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		sql, err := migrationFiles.ReadFile(entry.Name())
		if err != nil {
			return fmt.Errorf("migrations: read %s: %w", entry.Name(), err)
		}

		logger.Info("applying migration", "file", entry.Name())
		if _, err := conn.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("migrations: exec %s: %w", entry.Name(), err)
		}
	}

	return nil
}
