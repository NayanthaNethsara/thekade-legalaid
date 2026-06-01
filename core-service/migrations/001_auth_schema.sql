-- Auth schema: users, accounts (for account linking), and verification_tokens (OTP).
-- Applied to the shared Postgres database once during core-service init.
--
-- These tables live in a dedicated `auth` schema owned by core-service. The RAG
-- tables (admin-service, Alembic) stay in `public`, so the two services never
-- collide on names and the ownership boundary is visible in the schema itself.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_phone ON auth.users (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_users_role ON auth.users (role);

-- Account linking: one user can be associated with multiple auth providers.
-- Currently, only WhatsApp (provider='whatsapp', provider_account_id=phone).
CREATE TABLE IF NOT EXISTS auth.accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS ix_accounts_user_id ON auth.accounts (user_id);
CREATE INDEX IF NOT EXISTS ix_accounts_provider ON auth.accounts (provider);

-- Verification tokens: one-time codes with expiration (OTP for login).
-- identifier is the user identifier (phone for WhatsApp login);
-- token is the 6-digit code; expires is the expiration timestamp.
CREATE TABLE IF NOT EXISTS auth.verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (identifier, token)
);
CREATE INDEX IF NOT EXISTS ix_verification_tokens_expires ON auth.verification_tokens (expires);
