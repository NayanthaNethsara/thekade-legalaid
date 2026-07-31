"use client";

import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionTiles } from "./action-tiles";
import { NotesWidget } from "./notes-widget";
import { RemindersWidget } from "./reminders-widget";

/** Section stack shared by the desktop panel and the mobile sheet. */
export function StudioContent({ activeId }: { activeId: string }) {
  return (
    <div className="space-y-5">
      <section>
        <span className="text-foreground/35 mb-1.5 block text-[10px] font-semibold tracking-wider uppercase">
          Generate
        </span>
        <ActionTiles activeId={activeId} />
      </section>

      <section>
        <span className="text-foreground/35 mb-1.5 block text-[10px] font-semibold tracking-wider uppercase">
          Notes
        </span>
        <NotesWidget activeId={activeId} />
      </section>

      <section>
        <span className="text-foreground/35 mb-1.5 block text-[10px] font-semibold tracking-wider uppercase">
          Reminders
        </span>
        <RemindersWidget activeId={activeId} />
      </section>
    </div>
  );
}

/**
 * The right-hand Case Studio panel: research shortcuts plus notes and
 * reminders for the active matter. Desktop only; smaller screens open the
 * same content in a slide-over sheet.
 */
export function StudioPanel({
  activeId,
  collapsed,
  onToggleCollapse,
}: {
  activeId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col transition-all duration-300 ease-in-out lg:flex",
        collapsed ? "w-12" : "w-80"
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand case studio"
          className="text-foreground/65 hover:bg-foreground/8 hover:text-foreground/90 mx-auto mt-1 rounded-full p-2 transition-colors duration-200"
        >
          <PanelRight className="h-4.5 w-4.5" />
        </button>
      ) : (
        <div className="border-border bg-background flex h-full flex-col overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between pt-4 pr-2 pb-3 pl-4">
            <span className="text-foreground/90 text-sm font-semibold tracking-tight">
              Case Studio
            </span>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse case studio"
              className="text-foreground/65 hover:bg-foreground/8 hover:text-foreground/90 rounded-full p-2 transition-colors duration-200"
            >
              <PanelRight className="h-4.5 w-4.5" />
            </button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-4">
            <StudioContent activeId={activeId} />
          </div>
        </div>
      )}
    </aside>
  );
}
