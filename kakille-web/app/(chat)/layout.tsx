import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AmbientBackground } from "@/components/ambient-background";
import { ChatShell } from "@/components/animated-ai-chat/chat-shell";
import { getCurrentGuest } from "@/lib/guest/session";

/**
 * Shared shell for every chat route. The sidebar and account overlays live
 * here so they persist across navigation between conversations; the active
 * conversation page renders as {children}.
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const rawGuest = user ? null : await getCurrentGuest();
  const guest = rawGuest
    ? {
        display_name: rawGuest.display_name ?? "",
      }
    : null;

  if (!user && !guest) {
    redirect("/service-unavailable");
  }

  return (
    <main className="bg-background relative flex h-screen min-h-0 w-full flex-col">
      <AmbientBackground />
      <ChatShell user={user} guest={guest}>
        {children}
      </ChatShell>
    </main>
  );
}
