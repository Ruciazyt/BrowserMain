import { useState, useEffect, useRef } from 'react';
import { getFaviconUrlWithFallback, getFaviconUrl } from '../utils/storage';
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
  onDragLeave: () => void;
  onDrop: () => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
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
}: ShortcutTileProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(shortcut.title);
  const [editUrl, setEditUrl] = useState(shortcut.url);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [originalFailed, setOriginalFailed] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [faviconIcoFailed, setFaviconIcoFailed] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Reset all favicon fallback states when the shortcut changes
  // (e.g., after drag-drop reorder swaps which shortcut renders here)
  useEffect(() => {
    setOriginalFailed(false);
    setGoogleFailed(false);
    setFaviconIcoFailed(false);
  }, [shortcut.favicon]);

  // Keyboard navigation for reorder
  useEffect(() => {
    if (!keyboardFocus) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onMoveLeft?.(index);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onMoveRight?.(index);
      } else if (e.key === 'Escape') {
        setKeyboardFocus(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardFocus, index, onMoveLeft, onMoveRight]);

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

  const handleClick = () => {
    if (editMode) return;
    window.location.href = shortcut.url;
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

  const handleEdit = () => {
    setShowContextMenu(false);
    setEditTitle(shortcut.title);
    setEditUrl(shortcut.url);
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editUrl.trim()) {
      onUpdate(shortcut.id, { title: editTitle.trim(), url: editUrl.trim() });
    }
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  if (editMode) {
    return (
      <div className={styles.editMode}>
        <input
          className={styles.editInput}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title"
          autoFocus
        />
        <input
          className={styles.editInput}
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          placeholder="URL"
        />
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
        className={`${styles.container} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''} ${dropPosition === 'before' ? styles.dropBefore : ''} ${dropPosition === 'after' ? styles.dropAfter : ''} ${keyboardFocus ? styles.keyboardFocus : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={() => onDragStart(index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); const tileWidth = e.currentTarget.getBoundingClientRect().width; onDragOver(index, e.nativeEvent.offsetX, tileWidth); }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        tabIndex={0}
        onFocus={() => setKeyboardFocus(true)}
        onBlur={() => setKeyboardFocus(false)}
      >
        <div className={styles.iconWrapper}>
          {shortcut.favicon && !originalFailed ? (
            <img
              src={shortcut.favicon}
              alt=""
              onError={() => setOriginalFailed(true)}
            />
          ) : !googleFailed ? (
            <img
              src={getFaviconUrlWithFallback(shortcut.url)}
              alt=""
              onError={() => setGoogleFailed(true)}
            />
          ) : !faviconIcoFailed ? (
            <img
              src={getFaviconUrl(shortcut.url)}
              alt=""
              onError={() => setFaviconIcoFailed(true)}
            />
          ) : (
            <GlobeIcon />
          )}
        </div>
        <div className={styles.title}>{shortcut.title}</div>
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          aria-label="Delete shortcut"
        >
          ×
        </button>
        {keyboardFocus && (
          <div className={styles.keyboardHint}>← → to move · Esc to exit</div>
        )}
      </div>

      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button className={styles.contextMenuItem} onClick={handleEdit}>
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
