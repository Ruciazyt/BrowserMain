import { useState } from 'react';
import { Shortcut } from '../utils/storage';
import ShortcutTile from './ShortcutTile';
import styles from '../styles/components/ShortcutGrid.module.css';

interface ShortcutGridProps {
  shortcuts: Shortcut[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onReorder: (newOrder: Shortcut[]) => void;
  onAdd?: () => void;
}

export default function ShortcutGrid({ shortcuts, onDelete, onUpdate, onReorder, onAdd }: ShortcutGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newOrder = [...shortcuts];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dragOverIndex, 0, removed);
    onReorder(newOrder);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (shortcuts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No shortcuts yet</div>
          <div className={styles.emptyHint}>
            Click the <strong style={{ color: 'var(--led-amber)' }}>+</strong> button to add your first shortcut
          </div>
          {onAdd && (
            <button className={styles.addTile} onClick={onAdd} aria-label="Add shortcut" title="Add shortcut" style={{ marginTop: 16 }}>
              <span className={styles.addTileIcon}>+</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {shortcuts.map((shortcut, i) => (
        <ShortcutTile
          key={shortcut.id}
          shortcut={shortcut}
          onDelete={onDelete}
          onUpdate={onUpdate}
          index={i}
          isDragging={dragIndex === i}
          isDragOver={dragOverIndex === i}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ))}
      {onAdd && (
        <button className={styles.addTile} onClick={onAdd} aria-label="Add shortcut" title="Add shortcut">
          <span className={styles.addTileIcon}>+</span>
        </button>
      )}
    </div>
  );
}
