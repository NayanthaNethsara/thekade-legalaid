"use client";

import { NotebookPen, PanelRight, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionTiles } from "./action-tiles";
import { NotesWidget } from "./notes-widget";
import { RemindersWidget } from "./reminders-widget";
import { GLOBAL_SCOPE, useWorkspace } from "./workspace-store";

export const NOTE_INPUT_ID = "studio-note-input";

/** Section stack shared by the desktop panel and the mobile sheet. */
export function StudioContent({ activeId }: { activeId: string }) {
  const { notes, reminders } = useWorkspace();
  const scope = activeId || GLOBAL_SCOPE;
  const hasOutput =
    notes.items.some((note) => note.conversationId === scope) ||
    reminders.items.some((reminder) => reminder.conversationId === scope);

  return (
    <div className="space-y-4">
      <ActionTiles activeId={activeId} />

      <div className="border-border border-t" />

      {!hasOutput && (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <WandSparkles className="text-foreground/25 h-6 w-6" />
          <p className="text-foreground/70 text-sm font-semibold">
            Studio output will be saved here.
          </p>
          <p className="text-foreground/40 text-xs leading-relaxed">
            After adding sources, tap to generate an Audio Overview, Case
            Summary, Timeline, and more.
          </p>
        </div>
      )}

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
  const focusNoteInput = () => {
    const input = document.getElementById(NOTE_INPUT_ID);
    if (input instanceof HTMLTextAreaElement) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus();
    }
  };

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
          <div className="flex items-center justify-between pt-3 pr-2 pb-2 pl-4">
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
          <div className="flex shrink-0 justify-end px-4 pb-4">
            <button
              type="button"
              onClick={focusNoteInput}
              className="bg-foreground text-background press-scale flex items-center gap-2 rounded-full px-4 py-2 text-sm font-normal transition-opacity hover:opacity-90"
            >
              <NotebookPen className="h-4 w-4" />
              Add note
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
