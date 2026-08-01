"use client";

import { useCallback, useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSelectedLayoutSegment,
} from "next/navigation";
import { ChatSidebar } from "./chat-sidebar";
import { TopBar } from "./top-bar";
import { StudioContent, StudioPanel } from "@/components/studio/studio-panel";
import { SlideOver } from "@/components/ui/slide-over";
import { NotebookPen } from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { ProfilePanel } from "@/components/profile/profile-panel";
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
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [mobileStudioOpen, setMobileStudioOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileStudioOpen(false);
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
    <div className="text-foreground relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <TopBar
        user={user}
        onNewChat={handleNew}
        onToggleSources={() => setMobileSidebarOpen((prev) => !prev)}
        onToggleStudio={() => {
          if (window.innerWidth >= 1024) {
            setStudioCollapsed((prev) => !prev);
          } else {
            setMobileStudioOpen(true);
          }
        }}
        onSignIn={() => setLoginOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="flex min-h-0 flex-1 gap-3 p-3">
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

        <div className="border-border bg-background relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="flex h-11 shrink-0 items-center px-4">
            <span className="text-foreground/90 text-sm font-semibold tracking-tight">
              Chat
            </span>
          </div>
          {children}
          <p className="text-foreground/35 shrink-0 pt-1 pb-2.5 text-center text-xs select-none">
            Kakille can be inaccurate; please double check its responses.
          </p>
        </div>

        <StudioPanel
          activeId={activeId}
          collapsed={studioCollapsed}
          onToggleCollapse={() => setStudioCollapsed((prev) => !prev)}
        />
      </div>

      <div className="lg:hidden">
        <SlideOver
          open={mobileStudioOpen}
          onClose={() => setMobileStudioOpen(false)}
          title="Case Studio"
          icon={<NotebookPen className="h-4 w-4" />}
        >
          <StudioContent activeId={activeId} />
        </SlideOver>
      </div>

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
    </div>
  );
}
