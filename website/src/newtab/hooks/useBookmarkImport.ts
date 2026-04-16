import { useState, useCallback } from 'react';
import { Shortcut, getShortcuts, saveShortcuts } from '../utils/storage';

interface BMTreeNode {
  id: string;
  title: string;
  url?: string;
  children?: BMTreeNode[];
}

function countBookmarks(node: BMTreeNode): number {
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

      bookmarkTree.forEach((folder) => {
        if (selectedIds.has(folder.id)) {
          addFromFolder(folder);
        }
      });

      let imported = 0;
      let skipped = 0;

      const newShortcuts: Shortcut[] = selectedUrls
        .filter((url) => {
          if (existingUrls.has(url.toLowerCase())) {
            skipped++;
            return false;
          }
          return true;
        })
        .map((url, i) => ({
          id: Date.now().toString() + i,
          title: new URL(url).hostname.replace(/^www\./, ''),
          url,
          order: existing.length + i,
        }));

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
