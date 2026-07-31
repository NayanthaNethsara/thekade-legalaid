import "server-only";

import { cookies } from "next/headers";

import { apiFetch } from "@/lib/api";
import { GUEST_COOKIE, GUEST_MAX_AGE } from "@/lib/guest/constants";

export type Guest = { id: string; display_name: string | null };

export async function getGuestToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function setGuestSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_MAX_AGE,
  });
}

export async function clearGuestSession(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}

/**
 * Resolve the current guest from the backend, or null when the session is
 * missing or expired. `apiFetch` attaches the internal key, so the backend
 * accepts the guest bearer token only from our frontend.
 */
export async function getCurrentGuest(): Promise<Guest | null> {
  const token = await getGuestToken();
  if (!token) return null;

  const result = await apiFetch<Guest>("/guest/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return result.ok ? result.data : null;
}
