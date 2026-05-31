// Auth.js (NextAuth v5) configuration — the single authentication authority
// for the platform. The backend Go and Python services trust headers minted
// from this session and run no web-auth validation of their own.
//
// Strategy is stateless JWT (HTTP-only cookie): the CredentialsProvider does
// not support database sessions, and the verified user id/phone/role are small
// enough to live inside the token. No `sessions` table is required.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const CORE_SERVICE_URL =
  process.env.CORE_SERVICE_URL ?? "http://localhost:8002";

type ResolvedUser = {
  id: string;
  phone: string;
  role: "USER" | "ADMIN";
  name: string | null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "whatsapp-otp",
      name: "WhatsApp OTP",
      // Step 2 of the passwordless flow. Step 1 (dispatching the code) is
      // triggered separately via /api/otp/send before this runs.
      credentials: {
        phone: { label: "Phone", type: "tel" },
        otp: { label: "OTP", type: "text" },
      },
      // Verification and user management live in the Go core-service, which
      // owns the users/accounts/verification_tokens tables. This callback only
      // relays the result so Auth.js can mint the session JWT — the edge no
      // longer touches Postgres directly.
      authorize: async (credentials) => {
        const phone = String(credentials?.phone ?? "").trim();
        const otp = String(credentials?.otp ?? "").trim();
        if (!phone || otp.length !== 6) return null;

        let res: Response;
        try {
          res = await fetch(`${CORE_SERVICE_URL}/api/otp/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp }),
          });
        } catch {
          return null;
        }
        if (!res.ok) return null;

        const user = (await res.json()) as ResolvedUser;
        return {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    // Embed the database id, verified phone, and role into the JWT on sign-in.
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.role = user.role;
      }
      return token;
    },
    // Surface the same fields on the session object consumed by the proxy and
    // server components. The token carries an index signature of `unknown`
    // (its interface lives in a non-hoisted package we cannot augment), so the
    // enriched fields are asserted back to their known types here.
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.role = token.role as "USER" | "ADMIN";
      }
      return session;
    },
  },
});
