"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ChatUser } from "./chat-shell";

/**
 * NotebookLM-style application bar: brand on the left, session controls on the
 * right. Sits above the three-panel workspace as a frosted strip.
 */
export function TopBar({
  user,
  onToggleSources,
  onToggleStudio,
  onSignIn,
  onOpenProfile,
}: {
  user: ChatUser | null;
  onToggleSources: () => void;
  onToggleStudio?: () => void;
  onSignIn: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <header className="border-border bg-background/80 flex h-[52px] shrink-0 items-center justify-between border-b px-3 backdrop-blur-xl md:px-4">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSources}
          aria-label="Toggle sources panel"
          className="text-foreground/65 hover:bg-foreground/8 hover:text-foreground/90 rounded-full p-2 transition-colors duration-200 md:hidden"
        >
          <PanelLeft className="h-4.5 w-4.5" />
        </button>
        <div className="flex items-baseline gap-2 leading-none">
          <span className="text-foreground text-[17px] font-semibold tracking-tight">
            Kakille
          </span>
          <span className="text-muted-foreground text-[10px] font-medium tracking-[0.18em] uppercase">
            Legal Aid
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onToggleStudio && (
          <button
            type="button"
            onClick={onToggleStudio}
            aria-label="Toggle case studio panel"
            className="text-foreground/65 hover:bg-foreground/8 hover:text-foreground/90 rounded-full p-2 transition-colors duration-200"
          >
            <PanelRight className="h-4.5 w-4.5" />
          </button>
        )}
        <ThemeToggle />
        {user ? (
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open profile"
            className="press-scale"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.image}
              alt={user.display_name}
              className={cn(
                "border-border h-8 w-8 rounded-full border object-cover"
              )}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale rounded-full px-4 py-1.5 text-sm font-normal transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
