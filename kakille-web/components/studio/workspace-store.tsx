"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSelectedLayoutSegment } from "next/navigation";

import {
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from "@/lib/notes/actions";
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  updateReminder,
} from "@/lib/reminders/actions";
import {
  deleteSource,
  fetchSources,
  setAllSourcesSelected,
  setSourceSelected,
} from "@/lib/sources/actions";
import type { NoteItem, ReminderItem, SourceItem } from "@/types/workspace";

export type { NoteItem, ReminderItem, SourceItem, SourceKind } from "@/types/workspace";

/** Scope key for workspace items created outside a conversation. */
export const GLOBAL_SCOPE = "global";

export interface WorkspaceCollection<T extends { id: string }> {
  items: T[];
  /** Insert a server-created row at the head without a refetch. */
  insert: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  replaceAll: (items: T[]) => void;
  refresh: () => void;
  hydrated: boolean;
}

interface WorkspaceValue {
  conversationId: string;
  sources: WorkspaceCollection<SourceItem>;
  notes: WorkspaceCollection<NoteItem>;
  reminders: WorkspaceCollection<ReminderItem>;
  addNote: (content: string) => Promise<void>;
  editNote: (id: string, content: string) => Promise<void>;
  addReminder: (title: string, dueDate: string) => Promise<void>;
  toggleReminderDone: (id: string, isDone: boolean) => Promise<void>;
  toggleSourceSelected: (id: string, isSelected: boolean) => Promise<void>;
  selectAllSources: (isSelected: boolean) => Promise<void>;
  selectedSourceIds: string[];
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * A conversation-scoped collection backed by the workspace API. Mutations apply
 * optimistically and re-fetch on failure so the panel never drifts from the
 * server for long.
 */
function useServerCollection<T extends { id: string }>(
  conversationId: string,
  load: (conversationId: string) => Promise<T[]>
): WorkspaceCollection<T> {
  const [items, setItems] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    let isStale = false;
    load(conversationId).then((loaded) => {
      if (!isStale) {
        setItems(loaded);
        setHydrated(true);
      }
    });
    return () => {
      isStale = true;
    };
  }, [conversationId, load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(false);
    return refresh();
  }, [refresh]);

  const insert = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const update = useCallback((id: string, patch: Partial<T>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const replaceAll = useCallback((next: T[]) => {
    setItems(next);
  }, []);

  return { items, insert, update, remove, replaceAll, refresh, hydrated };
}

/**
 * Server-backed workspace state for the active conversation: the user's
 * sources, notes, and reminders. Everything is owned by the backend, so it
 * follows the user across devices and is visible to the agent's tools.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const conversationId = useSelectedLayoutSegment() || GLOBAL_SCOPE;

  const sources = useServerCollection<SourceItem>(conversationId, fetchSources);
  const notes = useServerCollection<NoteItem>(conversationId, fetchNotes);
  const reminders = useServerCollection<ReminderItem>(
    conversationId,
    fetchReminders
  );

  const addNote = useCallback(
    async (content: string) => {
      const created = await createNote(conversationId, content);
      if (created) notes.insert(created);
      else notes.refresh();
    },
    [conversationId, notes]
  );

  const editNote = useCallback(
    async (id: string, content: string) => {
      notes.update(id, { content } as Partial<NoteItem>);
      const saved = await updateNote(id, content);
      if (!saved) notes.refresh();
    },
    [notes]
  );

  const addReminder = useCallback(
    async (title: string, dueDate: string) => {
      const created = await createReminder(conversationId, title, dueDate);
      if (created) reminders.insert(created);
      else reminders.refresh();
    },
    [conversationId, reminders]
  );

  const toggleReminderDone = useCallback(
    async (id: string, isDone: boolean) => {
      reminders.update(id, { isDone } as Partial<ReminderItem>);
      const saved = await updateReminder(id, { isDone });
      if (!saved) reminders.refresh();
    },
    [reminders]
  );

  const toggleSourceSelected = useCallback(
    async (id: string, isSelected: boolean) => {
      sources.update(id, { isSelected } as Partial<SourceItem>);
      const ok = await setSourceSelected(id, isSelected);
      if (!ok) sources.refresh();
    },
    [sources]
  );

  const selectAllSources = useCallback(
    async (isSelected: boolean) => {
      sources.replaceAll(
        sources.items.map((source) => ({ ...source, isSelected }))
      );
      const updated = await setAllSourcesSelected(conversationId, isSelected);
      if (updated.length) sources.replaceAll(updated);
      else sources.refresh();
    },
    [conversationId, sources]
  );

  const selectedSourceIds = useMemo(
    () => sources.items.filter((s) => s.isSelected).map((s) => s.id),
    [sources.items]
  );

  const value = useMemo(
    () => ({
      conversationId,
      sources,
      notes,
      reminders,
      addNote,
      editNote,
      addReminder,
      toggleReminderDone,
      toggleSourceSelected,
      selectAllSources,
      selectedSourceIds,
    }),
    [
      conversationId,
      sources,
      notes,
      reminders,
      addNote,
      editNote,
      addReminder,
      toggleReminderDone,
      toggleSourceSelected,
      selectAllSources,
      selectedSourceIds,
    ]
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

/** Delete helpers that keep the optimistic list and the server in step. */
export function useWorkspaceDeletions() {
  const { sources, notes, reminders } = useWorkspace();

  return useMemo(
    () => ({
      removeSource: async (id: string) => {
        sources.remove(id);
        if (!(await deleteSource(id))) sources.refresh();
      },
      removeNote: async (id: string) => {
        notes.remove(id);
        if (!(await deleteNote(id))) notes.refresh();
      },
      removeReminder: async (id: string) => {
        reminders.remove(id);
        if (!(await deleteReminder(id))) reminders.refresh();
      },
    }),
    [sources, notes, reminders]
  );
}
