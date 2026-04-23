import { useState, useCallback } from 'react';
import { Shortcut, getShortcuts, saveShortcuts } from '../utils/storage';

export interface BMTreeNode {
  id: string;
  title: string;
  url?: string;
  children?: BMTreeNode[];
}

export function countBookmarks(node: BMTreeNode): number {
  if (node.url) return 1;
  if (!node.children) return 0;
  return node.children.reduce((sum, child) => sum + countBookmarks(child), 0);
}

export function useBookmarkImport() {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchBookmarkTree = useCallback((): Promise<BMTreeNode[]> => {
    return new Promise((resolve) => {
      setLoading(true);
      chrome.bookmarks.getTree((tree) => {
        setLoading(false);
        const root = tree[0];
        const children = root.children || [];
        const result: BMTreeNode[] = children
          .filter((node: BMTreeNode) => node.children && countBookmarks(node) > 0)
          .map((node: BMTreeNode) => ({
            id: node.id,
            title: node.title || (node.id === '1' ? 'Bookmarks Bar' : node.id === '2' ? 'Other Bookmarks' : 'Folder'),
            children: node.children,
          }));
        resolve(result);
      });
    });
  }, []);

  const importBookmarks = useCallback(async (
    selectedIds: Set<string>,
    bookmarkTree: BMTreeNode[]
  ): Promise<{ imported: number; skipped: number }> => {
    setImporting(true);
    try {
      const existing = await getShortcuts();
      const existingUrls = new Set(existing.map((s) => s.url.toLowerCase()));
      const selectedUrls: string[] = [];
      const urlsSet = new Set<string>();

      function addFromFolder(node: BMTreeNode): void {
        if (node.url && node.url.startsWith('http')) {
          const urlLower = node.url.toLowerCase();
          if (!urlsSet.has(urlLower)) {
            urlsSet.add(urlLower);
            selectedUrls.push(node.url);
          }
        }
        if (node.children) {
          node.children.forEach(addFromFolder);
        }
      }

      function visitSelectedNodes(nodes: BMTreeNode[]): void {
        nodes.forEach((node) => {
          if (selectedIds.has(node.id)) {
            addFromFolder(node);
          }
          if (node.children) {
            visitSelectedNodes(node.children);
          }
        });
      }

      visitSelectedNodes(bookmarkTree);

      let imported = 0;
      let skipped = 0;

      const newShortcuts: Shortcut[] = selectedUrls
        .filter((url) => {
          if (existingUrls.has(url.toLowerCase())) {
            skipped++;
            return false;
          }
          // Validate http/https URL before creating shortcut
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return false;
          }
          try {
            new URL(url);
          } catch {
            return false;
          }
          return true;
        })
        .map((url, i) => {
          const { hostname } = new URL(url);
          const domain = encodeURIComponent(hostname);
          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: hostname.replace(/^www\./, ''),
            url,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            order: existing.length + i,
          };
        });

      if (newShortcuts.length > 0) {
        await saveShortcuts([...existing, ...newShortcuts]);
      }

      imported = newShortcuts.length;
      return { imported, skipped };
    } finally {
      setImporting(false);
    }
  }, []);

  return { fetchBookmarkTree, importBookmarks, loading, importing };
}
