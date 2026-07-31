"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GLOBAL_SCOPE,
  newWorkspaceItemId,
  useWorkspace,
  type NoteItem,
} from "./workspace-store";

/** Notes scoped to the active conversation (or global on the landing route). */
export function NotesWidget({ activeId }: { activeId: string }) {
  const { notes } = useWorkspace();
  const scope = activeId || GLOBAL_SCOPE;
  const scopedNotes = notes.items.filter(
    (note) => note.conversationId === scope
  );
  const [draft, setDraft] = useState("");

  const addNote = () => {
    const content = draft.trim();
    if (!content) return;
    notes.add({
      id: newWorkspaceItemId(),
      conversationId: scope,
      content,
      updatedAt: new Date().toISOString(),
    });
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="Add a note"
          rows={1}
          className="border-border bg-background text-foreground/90 placeholder:text-foreground/30 min-w-0 flex-1 resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={!draft.trim()}
          aria-label="Add note"
          className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale shrink-0 rounded-full p-2 transition-colors disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {scopedNotes.length === 0 ? (
        <p className="text-foreground/30 py-2 text-center text-xs">
          No notes yet
        </p>
      ) : (
        <ul className="space-y-1.5">
          {scopedNotes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onSave={(content) =>
                notes.update(note.id, {
                  content,
                  updatedAt: new Date().toISOString(),
                })
              }
              onDelete={() => notes.remove(note.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({
  note,
  onSave,
  onDelete,
}: {
  note: NoteItem;
  onSave: (content: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);

  const save = () => {
    const content = draft.trim();
    if (content) onSave(content);
    setIsEditing(false);
  };

  return (
    <li className="group bg-muted rounded-lg px-3 py-2">
      {isEditing ? (
        <div className="flex items-start gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            className="border-border bg-background text-foreground/90 min-w-0 flex-1 resize-none rounded-md border px-2 py-1.5 text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={save}
            aria-label="Save note"
            className="text-primary hover:bg-foreground/5 shrink-0 rounded-md p-1 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(note.content);
              setIsEditing(false);
            }}
            aria-label="Cancel editing"
            className="text-foreground/40 hover:text-foreground/70 shrink-0 rounded-md p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-1.5">
          <p
            className={cn(
              "text-foreground/80 min-w-0 flex-1 text-xs whitespace-pre-wrap"
            )}
          >
            {note.content}
          </p>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="Edit note"
            className="text-foreground/20 hover:text-foreground/55 shrink-0 rounded-md p-1 opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete note"
            className="text-foreground/20 hover:text-foreground/55 shrink-0 rounded-md p-1 opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </li>
  );
}
