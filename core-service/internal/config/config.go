package config

import "os"

type Config struct {
	Env         string
	Port        string
	NATSURL     string
	DatabaseURL string

	// NATS subjects shared with the whatsapp-gateway.
	IncomingTextSubject string
	OutgoingTextSubject string
}

func Load() Config {
	return Config{
		Env:                 getenv("ENV", "development"),
		Port:                getenv("PORT", "8002"),
		NATSURL:             getenv("NATS_URL", "nats://localhost:4222"),
		DatabaseURL:         getenv("DATABASE_URL", "postgres://legalaid:legalaid@localhost:5433/legalaid"),
		IncomingTextSubject: getenv("NATS_SUBJECT_INCOMING_TEXT", "whatsapp.incoming.text"),
		OutgoingTextSubject: getenv("NATS_SUBJECT_OUTGOING_TEXT", "whatsapp.outgoing.text"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
