import { useState, useEffect, useCallback } from 'react';
import { Shortcut, getShortcuts, saveShortcuts, getFaviconUrl, getSmartFaviconUrl } from '../utils/storage';
import { createShortcutId, DEFAULT_GROUP_NAME, groupStorageKey, recomputeOrder } from '../utils/shortcuts';

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShortcuts().then((data) => {
      setShortcuts(data);
      setLoading(false);
    });
  }, []);

  // All mutations read from chrome.storage.local at call time so they see the
  // latest persisted list, then merge with the React state via a functional
  // updater. This makes the writes idempotent against any concurrent
  // updateShortcut calls (favicon auto-fetch, group rename, etc.) and
  // prevents the duplicate-on-cross-group bug where an old shortcut array
  // would clobber a newer one.
  const addShortcut = useCallback(async (title: string, url: string, favicon?: string, group?: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const current = await getShortcuts();
    const normalizedUrl = trimmedUrl.toLowerCase();
    if (current.some((s) => s.url.toLowerCase() === normalizedUrl)) {
      return;
    }
    const newShortcut: Shortcut = {
      id: createShortcutId(),
      title: title.trim() || trimmedUrl,
      url: trimmedUrl,
      favicon: favicon || getFaviconUrl(trimmedUrl),
      order: current.length,
      group: group?.trim() || undefined,
    };
    const updated = [...current, newShortcut];
    await saveShortcuts(updated);
    setShortcuts((prev) => (prev.some((s) => s.id === newShortcut.id || s.url.toLowerCase() === normalizedUrl) ? prev : [...prev, newShortcut]));
  }, []);

  const removeShortcut = useCallback(async (id: string) => {
    const current = await getShortcuts();
    const updated = current.filter((s) => s.id !== id);
    await saveShortcuts(updated);
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateShortcut = useCallback(async (id: string, updates: Partial<Shortcut>) => {
    const current = await getShortcuts();
    const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await saveShortcuts(updated);
    setShortcuts((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  // Re-read storage before writing the new order. Without this, a concurrent
  // updateShortcut (e.g. favicon auto-fetch) that landed between the drag end
  // and the storage write would be silently overwritten — the root cause of
  // the "duplicate shortcut on cross-group move" bug. We merge by id so
  // out-of-band updates to other fields (favicon, title) survive.
  const reorderShortcuts = useCallback(async (nextOrder: Shortcut[]) => {
    const current = await getShortcuts();
    const currentById = new Map(current.map((s) => [s.id, s]));
    const nextIds = new Set(nextOrder.map((s) => s.id));
    const merged: Shortcut[] = nextOrder.map((next) => {
      const existing = currentById.get(next.id);
      if (!existing) return next;
      // `next` is a partial patch from the drag end. Undefined values are
      // treated as "don't touch" — they don't overwrite the persisted
      // value. This is what makes a concurrent favicon update survive a
      // reorder whose payload was built before the favicon arrived.
      const patch: Partial<Shortcut> = {};
      for (const [k, v] of Object.entries(next)) {
        if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
      }
      return { ...existing, ...patch };
    });
    // Append any items that the reorder payload omitted — they exist in
    // storage but weren't part of this drag. (Should be rare, but the safety
    // net keeps us from losing data if the caller passes a partial list.)
    for (const item of current) {
      if (!nextIds.has(item.id)) merged.push(item);
    }
    const normalized = recomputeOrder(merged);
    await saveShortcuts(normalized);
    setShortcuts(normalized);
  }, []);

  const refreshShortcuts = useCallback(async () => {
    const data = await getShortcuts();
    setShortcuts(data);
  }, []);

  return {
    shortcuts,
    loading,
    addShortcut,
    removeShortcut,
    updateShortcut,
    reorderShortcuts,
    refreshShortcuts,
  };
}

export async function importShortcutsFromJson(file: File): Promise<{ imported: number; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json || !Array.isArray(json.shortcuts)) {
          resolve({ imported: 0, error: 'Invalid file format' });
          return;
        }
        const current = await getShortcuts();
        const existingUrls = new Set(current.map((s) => s.url.toLowerCase()));
        const newOnes = json.shortcuts.filter((s: any) =>
          s && s.url && typeof s.url === 'string' && !existingUrls.has(s.url.toLowerCase())
        );
        const toAdd = newOnes.map((s: any, i: number) => ({
          id: createShortcutId(),
          title: s.title || s.url,
          url: s.url,
          favicon: s.favicon || getSmartFaviconUrl(s.url),
          order: current.length + i,
          ...(s.group ? { group: s.group } : {}),
        }));
        if (toAdd.length === 0) {
          resolve({ imported: 0 });
          return;
        }
        await saveShortcuts([...current, ...toAdd]);
        resolve({ imported: toAdd.length });
      } catch {
        resolve({ imported: 0, error: 'Failed to parse file' });
      }
    };
    reader.onerror = () => resolve({ imported: 0, error: 'Failed to read file' });
    reader.readAsText(file);
  });
}

// Re-export so the SettingsPanel "remove group" + "clear all" code paths can
// import the helper from a single place without pulling storage internals.
export { DEFAULT_GROUP_NAME, groupStorageKey };
