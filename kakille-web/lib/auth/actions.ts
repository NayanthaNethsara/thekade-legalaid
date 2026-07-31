"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth/config";
import { clearGuestSession } from "@/lib/guest/session";

/**
 * Exchange a Firebase ID token (from the Google popup) for a NextAuth session
 * backed by the backend's own tokens.
 */
export async function loginWithGoogle(
  idToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!idToken) {
    return { success: false, error: "Google sign-in failed. Try again." };
  }

  try {
    await signIn("firebase", { idToken, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Google sign-in failed. Try again." };
    }
    throw error;
  }

  await clearGuestSession();
  return { success: true };
}

export async function logout(): Promise<void> {
  // Land back on the chat as a guest; sign-in happens via the dialog there.
  await signOut({ redirectTo: "/" });
}
