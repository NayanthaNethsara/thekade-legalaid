"use client";

import { createContext, useContext, useMemo } from "react";
import {
  useLocalCollection,
  type LocalCollection,
} from "@/hooks/use-local-collection";

export interface SourceItem {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
}

export interface NoteItem {
  id: string;
  conversationId: string;
  content: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  conversationId: string;
  title: string;
  dueDate: string;
  isDone: boolean;
}

/** Scope key for notes and reminders created outside a conversation. */
export const GLOBAL_SCOPE = "global";

export function newWorkspaceItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface WorkspaceValue {
  sources: LocalCollection<SourceItem>;
  notes: LocalCollection<NoteItem>;
  reminders: LocalCollection<ReminderItem>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * Browser-local workspace state: uploaded source metadata, notes, and
 * reminders. Persistence is localStorage only; backend sync can replace the
 * collections later without changing consumers.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const sources = useLocalCollection<SourceItem>("kakille.sources");
  const notes = useLocalCollection<NoteItem>("kakille.notes");
  const reminders = useLocalCollection<ReminderItem>("kakille.reminders");

  const value = useMemo(
    () => ({ sources, notes, reminders }),
    [sources, notes, reminders]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
