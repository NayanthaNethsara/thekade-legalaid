// Package identity resolves a WhatsApp phone number to a platform user,
// silently provisioning one on first contact. This is the WhatsApp-side mirror
// of the web login's auto-registration, so a user who only ever messages over
// WhatsApp still gets a durable id and role.
package identity

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/NayanthaNethsara/thekade-legalaid/core-service/internal/db/sqlc"
)

const whatsappProvider = "whatsapp"

// User is the resolved platform identity. The same shape is returned to the
// Next.js authorize callback (to mint the session JWT) and used by the
// WhatsApp worker to continue processing a message.
type User struct {
	ID    string  `json:"id"`
	Role  string  `json:"role"`
	Name  *string `json:"name"`
	Phone string  `json:"phone"`
}

type Matcher struct {
	pool    *pgxpool.Pool
	queries *sqlc.Queries
}

func NewMatcher(pool *pgxpool.Pool) *Matcher {
	return &Matcher{pool: pool, queries: sqlc.New(pool)}
}

// MatchOrRegister looks up the user linked to a WhatsApp number and, when none
// exists, provisions a USER + linked account atomically. Either both inserts
// land or neither does — a failure rolls the whole transaction back.
func (m *Matcher) MatchOrRegister(ctx context.Context, phone string) (User, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return User{}, errors.New("identity: empty phone number")
	}

	row, err := m.queries.LookupUserByPhone(ctx, sqlc.LookupUserByPhoneParams{
		Provider:          whatsappProvider,
		ProviderAccountID: phone,
	})
	if err == nil {
		return User{ID: row.ID, Role: row.Role, Name: row.Name, Phone: row.Phone}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return User{}, fmt.Errorf("identity lookup: %w", err)
	}

	return m.register(ctx, phone)
}

func (m *Matcher) register(ctx context.Context, phone string) (User, error) {
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return User{}, fmt.Errorf("identity: begin tx: %w", err)
	}
	// Rollback is a no-op once the tx is committed, so this is safe to defer
	// unconditionally and guarantees cleanup on any early return/panic.
	defer tx.Rollback(ctx) //nolint:errcheck // best-effort cleanup; commit path supersedes

	q := m.queries.WithTx(tx)

	userID := "usr_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	name := fmt.Sprintf("WhatsApp User (%s)", phone)

	inserted, err := q.InsertUser(ctx, sqlc.InsertUserParams{
		ID:    userID,
		Name:  &name,
		Phone: &phone,
	})
	if err != nil {
		return User{}, fmt.Errorf("identity: insert user: %w", err)
	}

	if err := q.InsertAccount(ctx, sqlc.InsertAccountParams{
		UserID:            userID,
		Provider:          whatsappProvider,
		ProviderAccountID: phone,
	}); err != nil {
		return User{}, fmt.Errorf("identity: insert account: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("identity: commit: %w", err)
	}

	return User{ID: inserted.ID, Role: inserted.Role, Name: inserted.Name, Phone: phone}, nil
}
