"use client";

import { useCallback, useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSelectedLayoutSegment,
} from "next/navigation";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./chat-sidebar";
import { CommerceHeader } from "@/components/commerce/commerce-header";
import { LoginDialog } from "@/components/auth/login-dialog";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { CheckoutDialog } from "@/components/commerce/checkout-dialog";
import { useCommerce } from "@/components/commerce/commerce-store";
import {
  deleteConversation as deleteConversationRemote,
  fetchConversationList,
} from "@/lib/chat/actions";
import type { ConversationSummary } from "@/types/chat";

export interface ChatUser {
  id: string;
  display_name: string;
  email: string;
  image: string;
}

export function ChatShell({
  user,
  guest,
  children,
}: {
  user: ChatUser | null;
  guest: { display_name: string } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = useSelectedLayoutSegment() ?? "";
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { isCheckoutOpen, setCheckoutOpen } = useCommerce();

  const refreshList = useCallback(() => {
    fetchConversationList().then(setConversations);
  }, []);

  // Resync the sidebar on every route change: covers landing on a freshly
  // created conversation and returning from one. Also closes the mobile drawer
  // so navigating away dismisses it.
  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileSidebarOpen(false);
  }, [pathname, user?.id, refreshList]);

  // Listen for the custom "refresh-conversations" event to update conversation titles locally in real-time
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<{
        conversationId: string;
        title?: string;
      }>;
      const detail = customEvent.detail;
      if (detail && detail.conversationId && detail.title) {
        const newTitle = detail.title;
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === detail.conversationId);
          if (!exists) {
            queueMicrotask(() => refreshList());
            return prev;
          }
          return prev.map((c) =>
            c.id === detail.conversationId ? { ...c, title: newTitle } : c
          );
        });
      } else {
        refreshList();
      }
    };
    window.addEventListener("refresh-conversations", handleRefresh);
    return () => {
      window.removeEventListener("refresh-conversations", handleRefresh);
    };
  }, [refreshList]);

  const handleNew = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // Only drop from the UI once the backend confirms deletion; a 404 means
      // an empty, never-persisted chat which is safe to drop too.
      const result = await deleteConversationRemote(id);
      if (!result.ok && result.status !== 404) return;
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) router.push("/");
    },
    [activeId, router]
  );

  return (
    <div className="text-foreground relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-transparent">
      <ChatSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onOpenProfile={() => {
          setProfileOpen(true);
          setMobileSidebarOpen(false);
        }}
        onSignIn={() => {
          setLoginOpen(true);
          setMobileSidebarOpen(false);
        }}
        user={user}
        guest={guest}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Top bar spanning the top of the chat area, fading/masking scrolling content behind it */}
      <div
        className={cn(
          "from-background/95 via-background/65 header-mask pointer-events-none absolute top-0 right-0 left-0 z-10 flex h-24 items-center bg-linear-to-b to-transparent px-4 backdrop-blur-md transition-all duration-300 ease-in-out md:h-16 md:bg-none md:from-transparent md:to-transparent md:px-6 md:backdrop-blur-none",
          sidebarCollapsed ? "md:left-[72px]" : "md:left-72"
        )}
      >
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileSidebarOpen(true);
              } else {
                setSidebarCollapsed((prev) => !prev);
              }
            }}
            aria-label="Toggle sidebar"
            className="border-foreground/6 bg-background/25 supports-backdrop-filter:bg-background/15 text-foreground/70 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-lg md:hidden"
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </button>
          <div
            className={cn("flex items-baseline gap-2 leading-none md:hidden")}
          >
            <span className="text-foreground/85 text-[17px] font-semibold tracking-tight">
              Kakille
            </span>
            <span className="text-foreground/35 text-[10px] font-medium tracking-[0.18em] uppercase">
              AI Assistant
            </span>
          </div>
        </div>
      </div>

      {children}

      <CommerceHeader isGuest={!user} onSignIn={() => setLoginOpen(true)} />

      {/* Overlays live at the shell root, outside the sidebar's overflow and
          backdrop-filter containing block. */}
      {user ? (
        <ProfilePanel
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      ) : (
        <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      )}

      <CheckoutDialog
        open={isCheckoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
}
