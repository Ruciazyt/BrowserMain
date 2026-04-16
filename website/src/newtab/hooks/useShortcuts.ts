import { useState, useEffect, useCallback } from 'react';
import { Shortcut, getShortcuts, saveShortcuts, getFaviconUrl } from '../utils/storage';

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShortcuts().then((data) => {
      setShortcuts(data);
      setLoading(false);
    });
  }, []);

  // All mutations read from chrome.storage.local at call time to avoid stale
  // closure bugs when multiple operations fire in rapid succession.
  const addShortcut = useCallback(async (title: string, url: string, favicon?: string) => {
    const current = await getShortcuts();
    const faviconUrl = favicon || getFaviconUrl(url);
    const newShortcut: Shortcut = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      url,
      favicon: faviconUrl,
      order: current.length,
    };
    const updated = [...current, newShortcut];
    await saveShortcuts(updated);
    setShortcuts(updated);
  }, []);

  const removeShortcut = useCallback(async (id: string) => {
    const current = await getShortcuts();
    const updated = current.filter((s) => s.id !== id);
    await saveShortcuts(updated);
    setShortcuts(updated);
  }, []);

  const updateShortcut = useCallback(async (id: string, updates: Partial<Shortcut>) => {
    const current = await getShortcuts();
    const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await saveShortcuts(updated);
    setShortcuts(updated);
  }, []);

  const reorderShortcuts = useCallback(async (newOrder: Shortcut[]) => {
    await saveShortcuts(newOrder);
    setShortcuts(newOrder);
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
