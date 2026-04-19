import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { getSmartFaviconUrl, getFaviconIcoUrl, getDomainFromUrl } from '../utils/storage';
import { isMac } from '../utils/platform';
import { isUrl } from '../utils/engines';
import { Shortcut } from '../utils/storage';
import styles from '../styles/components/ShortcutTile.module.css';

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.iconFallback}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

interface ShortcutTileProps {
  shortcut: Shortcut;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  dropPosition?: 'before' | 'after' | null;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOver: (index: number, offsetX: number, tileWidth: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: () => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  existingGroups?: string[];
}

export default function ShortcutTile({
  shortcut,
  onDelete,
  onUpdate,
  index,
  isDragging,
  isDragOver,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveLeft,
  onMoveRight,
  existingGroups,
}: ShortcutTileProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(shortcut.title);
  const [editUrl, setEditUrl] = useState(shortcut.url);
  const [editGroup, setEditGroup] = useState(shortcut.group || '');
  const [editFaviconSrc, setEditFaviconSrc] = useState(shortcut.favicon || getSmartFaviconUrl(shortcut.url));
  const [editFaviconTriedIco, setEditFaviconTriedIco] = useState(false);
  const [editError, setEditError] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  // Simplified: 2-stage favicon fallback
  const [faviconSrc, setFaviconSrc] = useState(shortcut.favicon || getSmartFaviconUrl(shortcut.url));
  const [faviconTriedIco, setFaviconTriedIco] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // When shortcut changes, reset favicon state
  useEffect(() => {
    const initial = shortcut.favicon || getSmartFaviconUrl(shortcut.url);
    setFaviconSrc(initial);
    setFaviconTriedIco(false);
  }, [shortcut.favicon, shortcut.url]);

  const handleFaviconError = () => {
    if (!faviconTriedIco) {
      // Try favicon.ico as second attempt
      setFaviconSrc(getFaviconIcoUrl(shortcut.url));
      setFaviconTriedIco(true);
    } else {
      // Give up — show globe icon
      setFaviconSrc('');
    }
  };

  // Consolidated keyboard handler: arrow keys for reorder, Enter/Space to open, Escape to blur
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editMode) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setIsNavigating(true);
      onMoveLeft?.(index);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setIsNavigating(true);
      onMoveRight?.(index);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToShortcut();
    } else if (e.key === 'Escape') {
      setIsNavigating(false);
      setKeyboardFocus(false);
    }
  };

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowContextMenu(false);
        if (editMode) setEditMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu, editMode]);

  const navigateToShortcut = () => {
    if (editMode || showContextMenu) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { url: shortcut.url });
      }
    });
  };


  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(shortcut.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Measure actual menu dimensions and adjust position to avoid viewport overflow
  useLayoutEffect(() => {
    if (!showContextMenu || !contextMenuRef.current) return;
    const menu = contextMenuRef.current;
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const EDGE_BUFFER = 8;
    setContextMenuPos((prev) => {
      let x = prev.x;
      let y = prev.y;
      if (x + menuWidth + EDGE_BUFFER > window.innerWidth) {
        x = window.innerWidth - menuWidth - EDGE_BUFFER;
      }
      if (x < EDGE_BUFFER) x = EDGE_BUFFER;
      if (y + menuHeight + EDGE_BUFFER > window.innerHeight) {
        y = window.innerHeight - menuHeight - EDGE_BUFFER;
      }
      if (y < EDGE_BUFFER) y = EDGE_BUFFER;
      return { x, y };
    });
  }, [showContextMenu]);

  // When editUrl changes in edit mode, auto-update the favicon
  useEffect(() => {
    if (!editMode) return;
    if (editUrl && isUrl(editUrl.trim())) {
      setEditFaviconSrc(getSmartFaviconUrl(editUrl.trim()));
      setEditFaviconTriedIco(false);
    }
  }, [editUrl, editMode]);

  const handleEditFaviconError = () => {
    if (!editFaviconTriedIco) {
      setEditFaviconSrc(getFaviconIcoUrl(editUrl.trim() || shortcut.url));
      setEditFaviconTriedIco(true);
    } else {
      setEditFaviconSrc('');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    setEditTitle(shortcut.title);
    setEditUrl(shortcut.url);
    setEditGroup(shortcut.group || '');
    setEditFaviconSrc(shortcut.favicon || getSmartFaviconUrl(shortcut.url));
    setEditFaviconTriedIco(false);
    setEditError(false);
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editUrl.trim()) {
      onUpdate(shortcut.id, { title: editTitle.trim(), url: editUrl.trim(), favicon: editFaviconSrc, group: editGroup.trim() || undefined });
      setEditMode(false);
    } else {
      setEditError(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  if (editMode) {
    return (
      <div className={styles.editMode}>
        <div className={styles.editIconRow}>
          {editFaviconSrc ? (
            <img src={editFaviconSrc} alt="" onError={handleEditFaviconError} className={styles.editFavicon} />
          ) : (
            <svg className={styles.editFaviconGlobe} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          )}
        </div>
        <input
          className={`${styles.editInput} ${editError && !editTitle.trim() ? styles.editInputError : ''}`}
          value={editTitle}
          onChange={(e) => { setEditTitle(e.target.value); setEditError(false); }}
          placeholder="Title"
          autoFocus
        />
        <input
          className={`${styles.editInput} ${editError && !editUrl.trim() ? styles.editInputError : ''}`}
          value={editUrl}
          onChange={(e) => { setEditUrl(e.target.value); setEditError(false); }}
          placeholder="URL"
        />
        <input
          className={`${styles.editInput} ${styles.editGroupInput}`}
          value={editGroup}
          onChange={(e) => setEditGroup(e.target.value)}
          placeholder="Group (optional)"
          list={existingGroups && existingGroups.length > 0 ? "edit-shortcut-group-suggestions" : undefined}
        />
        {existingGroups && existingGroups.length > 0 && (
          <datalist id="edit-shortcut-group-suggestions">
            {existingGroups.filter(g => g !== shortcut.group).map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        )}
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={handleSaveEdit}>Save</button>
          <button className={styles.cancelBtn} onClick={handleCancelEdit}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.container} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''} ${dropPosition === 'before' ? styles.dropBefore : ''} ${dropPosition === 'after' ? styles.dropAfter : ''} ${keyboardFocus ? styles.keyboardFocus : ''} ${isNavigating ? styles.navigating : ''}`}
        ref={containerRef}
        onContextMenu={handleContextMenu}
        draggable
        title={shortcut.url}
        onDragStart={() => onDragStart(index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); const tileWidth = e.currentTarget.getBoundingClientRect().width; onDragOver(index, e.nativeEvent.offsetX, tileWidth); }}
        onDragLeave={(e) => {
          // Only fire if we've truly left the tile (not just moved onto a child element)
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            onDragLeave(e);
          }
        }}
        onDrop={onDrop}
        onClick={navigateToShortcut}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onFocus={() => setKeyboardFocus(true)}
        onBlur={() => {
          setIsNavigating(false);
          setKeyboardFocus(false);
        }}
      >
        <div className={styles.iconWrapper}>
          {faviconSrc ? (
            <img src={faviconSrc} alt="" onError={handleFaviconError} title={shortcut.url} />
          ) : (
            <GlobeIcon />
          )}
        </div>
        {shortcut.group && <div className={styles.groupLabel}>{shortcut.group.toUpperCase()}</div>}
        <div className={styles.title}>{shortcut.title}</div>
        {!shortcut.group && <div className={styles.domain}>{getDomainFromUrl(shortcut.url)}</div>}
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          aria-label="Delete shortcut"
        >
          ×
        </button>
        {isNavigating && (
          <div className={styles.keyboardHint}>
            {isMac() ? '⌘← ⌘→ to move · Esc to exit' : '← → to move · Esc to exit'}
          </div>
        )}
      </div>

      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button className={styles.contextMenuItem} onClick={(e) => handleEdit(e)}>
            ✏️ Edit
          </button>
          <button className={styles.contextMenuItem} onClick={(e) => { e.stopPropagation(); onDelete(shortcut.id); setShowContextMenu(false); }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </>
  );
}
