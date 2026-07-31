import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { apiFetch } from "@/lib/api";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
};

type Profile = {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  source: string;
};

type BackendUser = {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  source: string;
  image?: string | null;
};

// The JWT interface lives in @auth/core/jwt (re-exported by next-auth/jwt), which
// can't be cleanly augmented under pnpm, so the token is cast to this shape.
type AppToken = {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
};

// Default backend access TTL is 15m; refresh a minute early as a fallback when
// the token's own exp cannot be read.
const ACCESS_FALLBACK_MS = 14 * 60 * 1000;

function accessTokenExpiry(token: string): number {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { exp?: number };
    return claims.exp ? claims.exp * 1000 : Date.now() + ACCESS_FALLBACK_MS;
  } catch {
    return Date.now() + ACCESS_FALLBACK_MS;
  }
}

// Turn a backend token pair into the NextAuth user, enriching it with the
// profile from /auth/me (the sign-in endpoint only returns tokens).
async function toUser(tokens: TokenResponse): Promise<User | null> {
  const me = await apiFetch<Profile>("/auth/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!me.ok) return null;
  return {
    id: me.data.id,
    phone: me.data.phone,
    email: me.data.email,
    display_name: me.data.display_name,
    source: me.data.source,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpires: accessTokenExpiry(tokens.access_token),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "firebase",
      name: "Google via Firebase",
      credentials: { idToken: {} },
      async authorize(credentials) {
        const idToken = credentials?.idToken as string | undefined;
        if (!idToken) return null;

        // The backend verifies the Firebase ID token against the Firebase
        // project and issues its own access/refresh pair.
        const result = await apiFetch<TokenResponse>("/auth/google", {
          method: "POST",
          body: JSON.stringify({ id_token: idToken }),
        });
        if (!result.ok) return null;

        const user = await toUser(result.data);
        if (user) {
          try {
            const payload = idToken
              .split(".")[1]
              .replace(/-/g, "+")
              .replace(/_/g, "/");
            const claims = JSON.parse(atob(payload)) as { picture?: string };
            if (claims.picture) {
              user.image = claims.picture;
            }
          } catch {
            // Ignore decoding failures
          }
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as typeof token & AppToken;

      if (user) {
        t.user = {
          id: user.id as string,
          phone: user.phone,
          email: user.email ?? null,
          display_name: user.display_name,
          source: user.source,
          image: user.image ?? null,
        };
        t.accessToken = user.accessToken;
        t.refreshToken = user.refreshToken;
        t.accessTokenExpires = user.accessTokenExpires;
        return t;
      }

      if (Date.now() < t.accessTokenExpires) return t;

      const refreshed = await apiFetch<TokenResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: t.refreshToken }),
      });
      if (!refreshed.ok) {
        // Returning null destroys the session: Auth.js expires its own cookie,
        // which middleware-side deletion cannot do reliably (the wrapper
        // re-sets the cookie after the response). The visitor drops to guest.
        return null;
      }
      t.accessToken = refreshed.data.access_token;
      t.refreshToken = refreshed.data.refresh_token;
      t.accessTokenExpires = accessTokenExpiry(refreshed.data.access_token);
      return t;
    },
    async session({ session, token }) {
      const t = token as typeof token & AppToken;
      // AdapterUser wants a non-null email; our backend user allows null, so
      // the merged shape needs a cast.
      session.user = { ...session.user, ...t.user } as typeof session.user;
      session.accessToken = t.accessToken;
      return session;
    },
  },
});
