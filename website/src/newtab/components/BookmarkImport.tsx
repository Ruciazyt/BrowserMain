import { useState, useEffect, useRef } from 'react';
import { useBookmarkImport, BMTreeNode, countBookmarks } from '../hooks/useBookmarkImport';
import styles from '../styles/components/BookmarkImport.module.css';

interface FolderItemProps {
  node: BMTreeNode;
  depth: number;
  selectedIds: Set<string>;
  toggleFolder: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function FolderItem({ node, depth, selectedIds, toggleFolder, expandedIds, toggleExpand }: FolderItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedIds.has(node.id);
  const bookmarkCount = countBookmarks(node);
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Determine indeterminate: if some children are selected but not all
  let childSelectedCount = 0;
  let childTotalCount = 0;
  if (node.children) {
    node.children.forEach((child) => {
      if (child.url || (child.children && child.children.length > 0)) {
        childTotalCount++;
        if (selectedIds.has(child.id)) childSelectedCount++;
      }
    });
  }
  const indeterminate = childTotalCount > 0 && childSelectedCount > 0 && childSelectedCount < childTotalCount;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className={styles.folderItem}>
      <div className={styles.folderRow} style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        {hasChildren && (
          <button
            className={styles.expandBtn}
            onClick={() => toggleExpand(node.id)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                width: 12,
                height: 12,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease-out',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        {!hasChildren && <span className={styles.expandPlaceholder} />}
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isSelected}
            ref={checkboxRef}
            onChange={() => toggleFolder(node.id)}
            className={styles.checkbox}
          />
          <span className={styles.folderTitle}>{node.title}</span>
          <span className={styles.bookmarkCount}>{bookmarkCount}</span>
        </label>
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {node.children!.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              toggleFolder={toggleFolder}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BookmarkImportProps {
  onBack: () => void;
  onImported?: () => void;
}

export default function BookmarkImport({ onBack, onImported }: BookmarkImportProps) {
  const { fetchBookmarkTree, importBookmarks, loading, importing } = useBookmarkImport();
  const [tree, setTree] = useState<BMTreeNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarkTree().then((nodes) => {
      setTree(nodes);
      // Auto-expand top-level folders
      setExpandedIds(new Set(nodes.map((n) => n.id)));
    }).catch(() => {
      setError('Failed to load bookmarks. Please check permissions.');
    });
  }, [fetchBookmarkTree]);

  const toggleFolder = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    const res = await importBookmarks(selectedIds, tree);
    setResult(res);
    onImported?.();
  };

  const handleBack = () => {
    setResult(null);
    setSelectedIds(new Set());
    setSearchQuery('');
    onBack();
  };

  // Recursively filter tree: include a node if its title matches OR any child is included
  const filterTree = (nodes: BMTreeNode[], query: string): BMTreeNode[] => {
    return nodes
      .map((node) => {
        const filteredChildren = node.children ? filterTree(node.children, query) : [];
        const titleMatch = query === '' || node.title.toLowerCase().includes(query.toLowerCase());
        const childMatch = filteredChildren.length > 0;
        if (titleMatch && childMatch) {
          return { ...node, children: filteredChildren };
        }
        if (titleMatch) {
          return { ...node };
        }
        if (childMatch) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter((n): n is BMTreeNode => n !== null);
  };

  const filteredTree = searchQuery === '' ? tree : filterTree(tree, searchQuery);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label="Back to settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.ledLoading}>
            <span /><span /><span />
          </div>
          <span className={styles.loadingText}>Loading bookmarks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label="Back to settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{error}</span>
        </div>
      </div>
    );
  }

  if (result !== null) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label="Back to settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
        <div className={styles.resultState}>
          <span className={styles.resultIcon}>✅</span>
          <div className={styles.resultText}>
            <span className={styles.resultTitle}>Import Complete</span>
            <span className={styles.resultDetail}>
              {result.imported > 0 ? `+${result.imported} imported` : 'No new bookmarks'}
              {result.skipped > 0 && ` (${result.skipped} skipped as duplicates)`}
            </span>
          </div>
          <button className={styles.doneBtn} onClick={handleBack}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className={styles.headerTitle}>Import Bookmarks</span>
      </div>

      {tree.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📂</span>
          <span className={styles.emptyText}>No bookmark folders found.</span>
        </div>
      ) : (
        <>
          <div className={styles.treeContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Filter folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {filteredTree.map((node) => (
              <FolderItem
                key={node.id}
                node={node}
                depth={0}
                selectedIds={selectedIds}
                toggleFolder={toggleFolder}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
          <div className={styles.footer}>
            <span className={styles.selectedCount}>
              {selectedIds.size === 0
                ? 'Select folders to import'
                : `${selectedIds.size} folder${selectedIds.size > 1 ? 's' : ''} selected`}
            </span>
            <button
              className={styles.importBtn}
              onClick={handleImport}
              disabled={selectedIds.size === 0 || importing}
            >
              {importing ? (
                <>
                  <span className={styles.miniLoading}><span /><span /><span /></span>
                  Importing...
                </>
              ) : (
                'Import Selected'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
