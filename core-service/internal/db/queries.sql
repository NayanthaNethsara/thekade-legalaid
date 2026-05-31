-- Identity queries

-- name: LookupUserByPhone :one
SELECT u.id, u.role, u.name, a.provider_account_id as phone
  FROM auth.users u
  JOIN auth.accounts a ON u.id = a.user_id
 WHERE a.provider = $1 AND a.provider_account_id = $2
 LIMIT 1;

-- name: InsertUser :one
INSERT INTO auth.users (id, name, phone, role)
      VALUES ($1, $2, $3, 'USER')
   RETURNING id, role, name, phone;

-- name: InsertAccount :exec
INSERT INTO auth.accounts (user_id, provider, provider_account_id)
      VALUES ($1, $2, $3);

-- OTP queries

-- name: StoreOTPToken :exec
INSERT INTO auth.verification_tokens (identifier, token, expires)
      VALUES ($1, $2, $3)
 ON CONFLICT DO NOTHING;

-- VerifyOTPToken consumes a code; the caller treats 0 affected rows as a
-- wrong/expired code.
-- name: VerifyOTPToken :execrows
DELETE FROM auth.verification_tokens
      WHERE identifier = $1 AND token = $2 AND expires > now();

-- name: ClearOTPTokens :exec
DELETE FROM auth.verification_tokens WHERE identifier = $1;
