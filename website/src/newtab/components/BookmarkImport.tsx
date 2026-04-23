import { useState, useEffect, useRef, useMemo } from 'react';
import { useBookmarkImport, BMTreeNode, countBookmarks } from '../hooks/useBookmarkImport';
import { useI18n } from '../i18n';
import styles from '../styles/components/BookmarkImport.module.css';

function collectFolderIds(node: BMTreeNode): string[] {
  const ids = [node.id];
  if (!node.children) return ids;
  node.children.forEach((child) => {
    if (child.children && child.children.length > 0) {
      ids.push(...collectFolderIds(child));
    }
  });
  return ids;
}

function findFolderNode(nodes: BMTreeNode[], id: string): BMTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFolderNode(node.children.filter((child) => child.children && child.children.length > 0), id);
      if (found) return found;
    }
  }
  return null;
}

function countFolders(nodes: BMTreeNode[]): number {
  return nodes.reduce((sum, node) => {
    const childFolders = node.children
      ? countFolders(node.children.filter((child) => child.children && child.children.length > 0))
      : 0;
    return sum + 1 + childFolders;
  }, 0);
}

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
  const { t } = useI18n();
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
      setError(t('bookmarkLoadFailed'));
    });
  }, [fetchBookmarkTree, t]);

  const toggleFolder = (id: string) => {
    const target = findFolderNode(tree, id);
    const relatedIds = target ? collectFolderIds(target) : [id];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldRemove = relatedIds.every((relatedId) => next.has(relatedId));
      if (shouldRemove) {
        relatedIds.forEach((relatedId) => next.delete(relatedId));
      } else {
        relatedIds.forEach((relatedId) => next.add(relatedId));
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
  const totalFolderCount = useMemo(() => countFolders(tree), [tree]);
  const visibleFolderCount = useMemo(() => countFolders(filteredTree), [filteredTree]);
  const totalBookmarkCount = useMemo(() => tree.reduce((sum, node) => sum + countBookmarks(node), 0), [tree]);
  const visibleFolderIds = useMemo(() => filteredTree.flatMap((node) => collectFolderIds(node)), [filteredTree]);

  const handleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleFolderIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('back')}
          </button>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.ledLoading}>
            <span /><span /><span />
          </div>
          <span className={styles.loadingText}>{t('bookmarksLoading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('back')}
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
          <button className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('back')}
          </button>
        </div>
        <div className={styles.resultState}>
          <span className={styles.resultIcon}>✅</span>
          <div className={styles.resultText}>
            <span className={styles.resultTitle}>{t('importComplete')}</span>
            <span className={styles.resultDetail}>
              {result.imported > 0 ? t('importedCount', { count: result.imported }) : t('noNewBookmarks')}
              {result.skipped > 0 && ` ${t('skippedDuplicates', { count: result.skipped })}`}
            </span>
          </div>
          <button className={styles.doneBtn} onClick={handleBack}>{t('done')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('back')}
        </button>
        <span className={styles.headerTitle}>{t('importBookmarks')}</span>
      </div>

      {tree.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📂</span>
          <span className={styles.emptyText}>{t('noBookmarkFolders')}</span>
        </div>
      ) : (
        <>
          <div className={styles.contentArea}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryEyebrow}>{t('browserBookmarks')}</div>
              <div className={styles.summaryTitle}>{t('bookmarkSummaryTitle')}</div>
              <div className={styles.summaryText}>{t('bookmarkSummaryText')}</div>
              <div className={styles.summaryStats}>
                <span className={styles.statChip}>{t('folders', { count: totalFolderCount })}</span>
                <span className={styles.statChip}>{t('bookmarksCount', { count: totalBookmarkCount })}</span>
                <span className={styles.statChip}>{t('selectedCountChip', { count: selectedIds.size })}</span>
              </div>
            </div>

            <div className={styles.toolbarCard}>
              <div className={styles.searchRow}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={t('searchBookmarkFolders')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')} aria-label={t('clearSearch')}>
                    {t('clear')}
                  </button>
                )}
              </div>
              <div className={styles.toolbarMetaRow}>
                <span className={styles.toolbarMeta}>{t('visibleFolders', { count: visibleFolderCount })}</span>
                <div className={styles.toolbarActions}>
                  <button className={styles.secondaryBtn} onClick={handleSelectVisible} disabled={visibleFolderIds.length === 0}>
                    {t('selectVisible')}
                  </button>
                  <button className={styles.secondaryBtn} onClick={handleClearSelection} disabled={selectedIds.size === 0}>
                    {t('clear')}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.treeSurface}>
              <div className={styles.treeHeaderRow}>
                <span className={styles.treeHeaderTitle}>{t('folderTree')}</span>
                <span className={styles.treeHeaderHint}>{t('folderTreeHint')}</span>
              </div>
              <div className={styles.treeContainer}>
                {filteredTree.length > 0 ? (
                  filteredTree.map((node) => (
                    <FolderItem
                      key={node.id}
                      node={node}
                      depth={0}
                      selectedIds={selectedIds}
                      toggleFolder={toggleFolder}
                      expandedIds={expandedIds}
                      toggleExpand={toggleExpand}
                    />
                  ))
                ) : (
                  <div className={styles.emptyResults}>
                    <span className={styles.emptyResultsTitle}>{t('noMatchingFolders')}</span>
                    <span className={styles.emptyResultsText}>{t('tryShorterKeyword')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <div className={styles.footerSummary}>
              <span className={styles.selectedCount}>
              {selectedIds.size === 0
                ? t('selectFoldersToImport')
                : selectedIds.size > 1
                  ? t('foldersSelectedPlural', { count: selectedIds.size })
                  : t('foldersSelected', { count: selectedIds.size })}
              </span>
              <span className={styles.footerHint}>{t('existingShortcutsPreserved')}</span>
            </div>
            <button
              className={styles.importBtn}
              onClick={handleImport}
              disabled={selectedIds.size === 0 || importing}
            >
              {importing ? (
                <>
                  <span className={styles.miniLoading}><span /><span /><span /></span>
                  {t('importing')}
                </>
              ) : (
                t('importSelected')
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
