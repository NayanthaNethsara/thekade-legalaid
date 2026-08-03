import "server-only";

import { auth } from "@/lib/auth/config";
import { getGuestToken } from "@/lib/guest/session";

/**
 * Resolve the caller's bearer: an account access token, or the guest token for
 * anonymous visitors. Workspace routes accept either.
 */
export async function workspaceBearer(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? (await getGuestToken());
}
