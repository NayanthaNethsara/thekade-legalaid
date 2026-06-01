// Package replay rejects reused request nonces, closing the replay window left
// open by signature + timestamp checks alone.
package replay

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const keyPrefix = "internalauth:nonce:"

type Store struct {
	client *redis.Client
}

func NewStore(url string) (*Store, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("replay: parse redis url: %w", err)
	}
	return &Store{client: redis.NewClient(opt)}, nil
}

// FirstUse atomically records the nonce and reports whether it had not been
// seen within ttl. Concurrent replays cannot both observe true.
func (s *Store) FirstUse(ctx context.Context, nonce string, ttl time.Duration) (bool, error) {
	return s.client.SetNX(ctx, keyPrefix+nonce, 1, ttl).Result()
}

func (s *Store) Close() error { return s.client.Close() }
