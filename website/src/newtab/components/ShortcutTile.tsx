import { useState, useEffect, useRef } from 'react';
import { Shortcut } from '../utils/storage';
import styles from '../styles/components/ShortcutTile.module.css';

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
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
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOver: (index: number) => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

export default function ShortcutTile({
  shortcut,
  onDelete,
  onUpdate,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: ShortcutTileProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(shortcut.title);
  const [editUrl, setEditUrl] = useState(shortcut.url);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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
        className={`${styles.container} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={() => onDragStart(index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className={styles.iconWrapper}>
          {shortcut.favicon ? (
            <img
              src={shortcut.favicon}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
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