// Shared between the edge middleware (proxy.ts) and server-only modules, so this
// file must stay free of `server-only` and Node APIs.

export const GUEST_COOKIE = "guest_session";

// Header carrying the shared secret that marks a backend call as coming from our
// own frontend. The browser never sees it.
export const INTERNAL_KEY_HEADER = "x-internal-key";

// Matches the backend AUTH_GUEST_TTL_SECONDS (1 day) so the cookie, the guest
// token, and the Redis record all expire together.
export const GUEST_MAX_AGE = 60 * 60 * 24;
