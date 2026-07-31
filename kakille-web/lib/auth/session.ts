import "server-only";

import { auth } from "@/lib/auth/config";
import type { ChatUser } from "@/components/animated-ai-chat/chat-shell";

/**
 * Retrieves the current authenticated user and normalizes their profile fields,
 * utilizing '/avatar.png' as the default fallback image.
 */
export async function getCurrentUser(): Promise<ChatUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    display_name: session.user.display_name || session.user.email || "User",
    email: session.user.email || "",
    image: session.user.image || "/avatar.png",
  };
}
