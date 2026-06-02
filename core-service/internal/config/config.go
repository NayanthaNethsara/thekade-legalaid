package config

import "os"

type Config struct {
	Env         string
	Port        string
	NATSURL     string
	DatabaseURL string

	// NATS subjects shared with the whatsapp-gateway.
	IncomingTextSubject string
	OutgoingSubject     string

	// Shared secret used to verify HMAC-signed requests from the Next.js edge.
	// Empty means the auth check fails closed and every internal endpoint 401s.
	InternalAuthSecret string

	// Redis backing the request-nonce store used to reject replays.
	RedisURL string
}

func Load() Config {
	return Config{
		Env:                 getenv("ENV", "development"),
		Port:                getenv("PORT", "8002"),
		NATSURL:             getenv("NATS_URL", "nats://localhost:4222"),
		DatabaseURL:         getenv("DATABASE_URL", "postgres://legalaid:legalaid@localhost:5433/legalaid"),
		IncomingTextSubject: getenv("NATS_SUBJECT_INCOMING_TEXT", "whatsapp.incoming.text"),
		OutgoingSubject:     getenv("NATS_SUBJECT_OUTGOING", "whatsapp.outgoing"),
		InternalAuthSecret:  getenv("INTERNAL_AUTH_SECRET", ""),
		RedisURL:            getenv("REDIS_URL", "redis://localhost:6379"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
