import { useState, useEffect, useCallback } from 'react';
import { Shortcut, getShortcuts, saveShortcuts } from '../utils/storage';

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShortcuts().then((data) => {
      setShortcuts(data);
      setLoading(false);
    });
  }, []);

  const addShortcut = useCallback(async (title: string, url: string, favicon?: string) => {
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      title,
      url,
      favicon,
      order: shortcuts.length,
    };
    const updated = [...shortcuts, newShortcut];
    await saveShortcuts(updated);
    setShortcuts(updated);
  }, [shortcuts]);

  const removeShortcut = useCallback(async (id: string) => {
    const updated = shortcuts.filter((s) => s.id !== id);
    await saveShortcuts(updated);
    setShortcuts(updated);
  }, [shortcuts]);

  const updateShortcut = useCallback(async (id: string, updates: Partial<Shortcut>) => {
    const updated = shortcuts.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await saveShortcuts(updated);
    setShortcuts(updated);
  }, [shortcuts]);

  const reorderShortcuts = useCallback(async (newOrder: Shortcut[]) => {
    await saveShortcuts(newOrder);
    setShortcuts(newOrder);
  }, []);

  return {
    shortcuts,
    loading,
    addShortcut,
    removeShortcut,
    updateShortcut,
    reorderShortcuts,
  };
}