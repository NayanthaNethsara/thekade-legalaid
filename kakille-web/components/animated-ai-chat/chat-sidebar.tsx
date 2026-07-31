"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Trash2, Plus, PanelLeft, Sun, Moon, User, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types/chat";
import { logout } from "@/lib/auth/actions";
import { generateGuestSessionInfo } from "@/lib/chat/actions";
import type { ChatUser } from "./chat-shell";

interface ChatSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  conversations: ConversationSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void | Promise<void>;
  onOpenProfile: () => void;
  onSignIn: () => void;
  user?: ChatUser | null;
  guest?: { display_name: string } | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatSidebar({
  mobileOpen,
  onCloseMobile,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onOpenProfile,
  onSignIn,
  user,
  guest,
  collapsed = false,
  onToggleCollapse,
}: ChatSidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [guestInfo, setGuestInfo] = useState<{
    name: string;
    color: string;
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user && guest) {
      const saved = sessionStorage.getItem("kakille.guestInfo");
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGuestInfo(JSON.parse(saved));
      } else {
        generateGuestSessionInfo().then((info) => {
          sessionStorage.setItem("kakille.guestInfo", JSON.stringify(info));
          setGuestInfo(info);
        });
      }
    }
  }, [user, guest]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const clickOutside = () => setDropdownOpen(false);
    window.addEventListener("click", clickOutside);
    return () => window.removeEventListener("click", clickOutside);
  }, [dropdownOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen((prev) => !prev);
  };

  const isDark = mounted && resolvedTheme === "dark";

  const displayName = user?.display_name ?? guest?.display_name ?? "Guest";

  return (
    <>
      <div
        onClick={onCloseMobile}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-30 bg-black/10 backdrop-blur-sm transition-opacity duration-300 md:hidden dark:bg-black/30",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />{" "}
      <div
        className={cn(
          "z-40 h-full shrink-0 p-3 transition-all duration-300 ease-in-out max-md:fixed max-md:top-0 max-md:left-0 max-md:h-[100dvh] max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:transition-transform max-md:duration-300 max-md:ease-out md:relative md:z-20",
          mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
          collapsed ? "md:w-[72px]" : "md:w-72"
        )}
      >
        <aside
          className={cn(
            "flex h-full flex-col transition-all duration-300 ease-in-out",
            collapsed
              ? "overflow-visible border-none bg-transparent shadow-none backdrop-blur-none md:w-12"
              : "border-foreground/6 bg-background/30 supports-[backdrop-filter]:bg-background/20 overflow-hidden rounded-[1.75rem] border backdrop-blur-xl md:w-72"
          )}
        >
          <div className="pt-4 pb-3">
            <div className="flex items-center gap-0">
              <div className="flex w-12 shrink-0 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onCloseMobile();
                    } else {
                      onToggleCollapse?.();
                    }
                  }}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="text-foreground/65 hover:bg-foreground/8 hover:text-foreground/90 rounded-full p-2 transition-colors duration-200"
                >
                  <PanelLeft className="h-4.5 w-4.5" />
                </button>
              </div>
              <div className="flex shrink-0 items-baseline gap-2 pl-3">
                <span className="text-foreground/90 text-lg font-semibold tracking-tight">
                  Kakille
                </span>
                <span className="text-foreground/35 text-[10px] font-medium tracking-[0.18em] uppercase">
                  AI Assistant
                </span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 pb-2 transition-all duration-300",
              collapsed && "md:space-y-4 md:px-0"
            )}
          >
            <div>
              {!collapsed && (
                <span className="text-foreground/35 mb-1.5 block px-2 text-[10px] font-semibold tracking-wider uppercase">
                  Quick Actions
                </span>
              )}
              <ul className={cn("space-y-0.5", collapsed && "md:space-y-1")}>
                <li>
                  <button
                    type="button"
                    onClick={onNew}
                    title="Start new chat"
                    className={cn(
                      "group flex w-full items-center rounded-lg text-left text-sm transition-all duration-200",
                      collapsed
                        ? "text-foreground/75 hover:bg-foreground/5 gap-0.5 md:mx-auto md:h-12 md:w-12 md:flex-col md:items-center md:justify-center md:p-1"
                        : "text-foreground/75 hover:bg-foreground/4 gap-2.5 px-2 py-1.5"
                    )}
                  >
                    <Plus className="text-foreground/70 group-hover:text-foreground/95 h-4.5 w-4.5 shrink-0 transition-colors duration-200" />
                    {collapsed ? (
                      <span className="text-foreground/65 group-hover:text-foreground/90 text-[9px] leading-none font-semibold tracking-tight transition-colors duration-200">
                        New
                      </span>
                    ) : (
                      <span>Start new chat</span>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            {!collapsed && (
              <div>
                <span className="text-foreground/35 mb-1.5 block px-2 text-[10px] font-semibold tracking-wider uppercase">
                  Recent
                </span>
                {conversations.length === 0 ? (
                  <p className="text-foreground/30 px-2 py-4 text-center text-sm">
                    No chats yet
                  </p>
                ) : (
                  <ul className="py-1">
                    {conversations.map((conv) => (
                      <li key={conv.id}>
                        <ConversationRow
                          conv={conv}
                          isActive={conv.id === activeId}
                          onSelect={onSelect}
                          onDelete={onDelete}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              "border-foreground/6 px-4 py-4 transition-all duration-300",
              collapsed ? "md:border-t-0 md:px-0 md:py-4" : "border-t"
            )}
          >
            <div
              className={cn(
                "flex flex-col gap-1.5",
                collapsed && "md:items-center"
              )}
            >
              <button
                type="button"
                onClick={toggleDropdown}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                className={cn(
                  "hover:bg-foreground/4 flex w-full items-center rounded-xl transition-all duration-200",
                  collapsed
                    ? "hover:bg-foreground/5 gap-0.5 md:mx-auto md:h-12 md:w-12 md:flex-col md:items-center md:justify-center md:p-1"
                    : "gap-3 p-2"
                )}
              >
                {user ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={displayName}
                    className="border-foreground/10 h-9 w-9 shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors",
                      guestInfo?.color || "bg-foreground/5"
                    )}
                  >
                    {guestInfo ? guestInfo.name.charAt(0).toUpperCase() : "G"}
                  </div>
                )}

                {!collapsed ? (
                  <>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-foreground/85 truncate text-xs leading-none font-semibold">
                        {user
                          ? displayName
                          : guestInfo
                            ? guestInfo.name
                            : "Guest"}
                      </p>
                      <p className="text-foreground/40 mt-1 truncate text-[10px] leading-none font-medium">
                        {user ? user.email || "Member" : "Guest"}
                      </p>
                    </div>
                    <span className="text-foreground/30 hover:text-foreground/60 transition-colors">
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </>
                ) : (
                  <span className="text-foreground/60 mt-0.5 text-[9px] leading-none font-semibold tracking-tight">
                    {user
                      ? user.display_name
                        ? user.display_name.split(" ")[0]
                        : "Profile"
                      : "Guest"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>
      {dropdownOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "border-foreground/8 bg-background/90 animate-in fade-in slide-in-from-bottom-2 fixed bottom-[72px] z-50 w-64 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-200",
            collapsed ? "left-[20px]" : "left-6"
          )}
        >
          <div className="border-foreground/5 flex items-center gap-3 border-b pb-3">
            {user ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={displayName}
                className="border-foreground/10 h-10 w-10 shrink-0 rounded-xl border object-cover"
              />
            ) : (
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-base font-semibold",
                  guestInfo?.color || "bg-foreground/5"
                )}
              >
                {guestInfo ? guestInfo.name.charAt(0).toUpperCase() : "G"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-foreground/90 truncate text-sm leading-none font-semibold">
                {user ? displayName : guestInfo ? guestInfo.name : "Guest"}
              </p>
              <p className="text-foreground/45 mt-1.5 truncate text-xs leading-none font-medium">
                {user ? user.email || "Member" : "Guest"}
              </p>
            </div>
          </div>

          <div className="space-y-1 py-2.5">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-foreground/75 hover:bg-foreground/4 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
            >
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
              {isDark ? (
                <Sun className="text-foreground/45 h-4 w-4" />
              ) : (
                <Moon className="h-4.5 w-4.5" />
              )}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => {
                  onOpenProfile();
                  setDropdownOpen(false);
                }}
                className="text-foreground/75 hover:bg-foreground/4 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
              >
                <span>Profile Settings</span>
                <User className="text-foreground/45 h-4 w-4" />
              </button>
            )}
          </div>

          <div className="border-foreground/5 border-t pt-2.5">
            {user ? (
              <form action={logout}>
                <button
                  type="submit"
                  className="text-destructive hover:bg-destructive/10 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors"
                >
                  <span>Sign out</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSignIn();
                  setDropdownOpen(false);
                }}
                className="text-foreground/75 hover:bg-foreground/4 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors"
              >
                <span>Sign in</span>
                <User className="text-foreground/45 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ConversationRow({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center rounded-lg px-3 py-2 transition-colors",
        isActive ? "bg-foreground/5" : "hover:bg-foreground/4"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(conv.id)}
        className="min-w-0 flex-1 text-left"
      >
        <span
          title={conv.title || "New chat"}
          className={cn(
            "block truncate text-sm",
            isActive ? "text-foreground/90" : "text-foreground/55"
          )}
        >
          {conv.title || "New chat"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(conv.id)}
        aria-label="Delete"
        className="text-foreground/20 hover:text-foreground/55 ml-1 shrink-0 rounded-md p-1 opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
