package config

import "os"

type Config struct {
	Env     string
	Port    string
	NATSURL string
}

func Load() Config {
	return Config{
		Env:     getenv("ENV", "development"),
		Port:    getenv("PORT", "8002"),
		NATSURL: getenv("NATS_URL", "nats://localhost:4222"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
