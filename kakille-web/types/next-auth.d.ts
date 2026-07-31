import type { DefaultSession } from "next-auth";

// The user fields we carry from the FastAPI backend through NextAuth. Web
// accounts come from Google sign-in (no phone); WhatsApp accounts never sign
// in here.
type BackendUser = {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  source: string;
  image?: string | null;
};

declare module "next-auth" {
  interface Session {
    user: BackendUser & DefaultSession["user"];
    // Short-lived backend access token, for authenticated backend calls.
    accessToken?: string;
  }

  // Shape returned by the Credentials `authorize` callback.
  interface User {
    id?: string;
    phone: string | null;
    email: string | null;
    display_name: string | null;
    source: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    image?: string | null;
  }
}
