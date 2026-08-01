"use client";

import { useCallback, useEffect, useState } from "react";

export interface LocalCollection<T extends { id: string }> {
  items: T[];
  add: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  hydrated: boolean;
}

/**
 * A small persistent collection backed by localStorage. Items load after mount
 * so server and client markup match, and every mutation writes back.
 */
export function useLocalCollection<T extends { id: string }>(
  storageKey: string
): LocalCollection<T> {
  const [items, setItems] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(raw) as T[]);
      }
    } catch {
      // Corrupt or inaccessible storage falls back to an empty collection.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Storage may be full or blocked; the in-memory list still works.
    }
  }, [storageKey, items, hydrated]);

  const add = useCallback((item: T) => {
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

  return { items, add, update, remove, hydrated };
}
