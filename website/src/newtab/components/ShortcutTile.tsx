import { useState } from 'react';
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
}

export default function ShortcutTile({ shortcut, onDelete }: ShortcutTileProps) {
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleClick = () => {
    window.location.href = shortcut.url;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(shortcut.id);
  };

  return (
    <div
      className={`${styles.container} ${dragging ? styles.dragging : ''} ${dragOver ? styles.dragOver : ''}`}
      onClick={handleClick}
      draggable
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => setDragOver(false)}
    >
      <div className={styles.iconWrapper}>
        {shortcut.favicon ? (
          <img src={shortcut.favicon} alt="" />
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
  );
}