import { useState, useEffect, useCallback } from 'react';
import { Shortcut, getShortcuts, saveShortcuts, getFaviconUrl, getSmartFaviconUrl } from '../utils/storage';

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

export async function exportShortcutsAsJson() {
  const data = await getShortcuts();
  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    shortcuts: data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `browsermain-shortcuts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
        const existingUrls = new Set(current.map(s => s.url.toLowerCase()));
        const newOnes = json.shortcuts.filter((s: any) =>
          s && s.url && typeof s.url === 'string' && !existingUrls.has(s.url.toLowerCase())
        );
        const toAdd = newOnes.map((s: any, i: number) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: s.title || s.url,
          url: s.url,
          favicon: s.favicon || getSmartFaviconUrl(s.url),
          order: current.length + i,
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
