// Signs Next.js -> backend-service calls so they can
// reject anything not minted by this edge. The per-request nonce lets the backend
// reject replays. Server-side only: the secret must never reach the browser.

import { createHmac, randomBytes } from "node:crypto";

const SECRET = process.env.INTERNAL_AUTH_SECRET;

export const AUTH_TIMESTAMP_SKEW_SECONDS = 30;

type IdentityClaims = {
  userId?: string;
  role?: string;
};

export function internalAuthHeaders(
  method: string,
  path: string,
  claims: IdentityClaims = {},
): Record<string, string> {
  if (!SECRET) {
    throw new Error("INTERNAL_AUTH_SECRET is not set");
  }

  const userId = claims.userId ?? "";
  const role = claims.role ?? "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");

  const canonical = [
    method.toUpperCase(),
    path.split("?")[0],
    userId,
    role,
    timestamp,
    nonce,
  ].join("\n");
  const signature = createHmac("sha256", SECRET).update(canonical).digest("hex");

  const headers: Record<string, string> = {
    "X-Auth-Timestamp": timestamp,
    "X-Auth-Nonce": nonce,
    "X-Auth-Signature": signature,
  };
  if (userId) headers["X-User-ID"] = userId;
  if (role) headers["X-User-Role"] = role;
  return headers;
}
