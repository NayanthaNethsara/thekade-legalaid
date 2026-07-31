"use server";

import { auth } from "@/lib/auth/config";
import { apiFetch } from "@/lib/api";
import type { Profile, ProfileInput } from "@/types/profile";

export type ProfileResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

const SESSION_EXPIRED = "Your session expired. Please sign in again.";

async function bearer(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

/**
 * Profile management is for signed-in users only; the backend /profile endpoints
 * authenticate with the user access token, so guests have no profile here.
 */
export async function getProfile(): Promise<ProfileResult> {
  const token = await bearer();
  if (!token) return { ok: false, error: SESSION_EXPIRED };

  const result = await apiFetch<Profile>("/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return result.ok
    ? { ok: true, profile: result.data }
    : { ok: false, error: result.detail };
}

export async function updateProfile(
  input: ProfileInput
): Promise<ProfileResult> {
  const token = await bearer();
  if (!token) return { ok: false, error: SESSION_EXPIRED };

  const result = await apiFetch<Profile>("/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return result.ok
    ? { ok: true, profile: result.data }
    : { ok: false, error: result.detail };
}

export async function clearMemory(): Promise<ActionResult> {
  const token = await bearer();
  if (!token) return { ok: false, error: SESSION_EXPIRED };

  const result = await apiFetch<unknown>("/profile/memory", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return result.ok ? { ok: true } : { ok: false, error: result.detail };
}
