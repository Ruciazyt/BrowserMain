import { useState } from 'react';
import { Shortcut } from '../utils/storage';
import ShortcutTile from './ShortcutTile';
import styles from '../styles/components/ShortcutGrid.module.css';

const DECORATIVE_DOTS = [1, 0, 1, 0, 1, 0, 1, 0];

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
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
    setIsDraggingAny(true);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    setIsDraggingAny(false);
  };

  const handleDragOver = (index: number, offsetX: number, tileWidth: number) => {
    setDragOverIndex(index);
    setDropPosition(offsetX < tileWidth / 2 ? 'before' : 'after');
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }
    const insertIndex = (() => {
      if (dropPosition === 'after') {
        return dragIndex < dragOverIndex ? dragOverIndex : dragOverIndex + 1;
      }
      // before
      return dragIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex;
    })();
    const newOrder = [...shortcuts];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(insertIndex, 0, removed);
    onReorder(newOrder);
    setDragIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleMoveLeft = (fromIndex: number) => {
    if (fromIndex <= 0) return;
    const newOrder = [...shortcuts];
    [newOrder[fromIndex - 1], newOrder[fromIndex]] = [newOrder[fromIndex], newOrder[fromIndex - 1]];
    onReorder(newOrder);
  };

  const handleMoveRight = (fromIndex: number) => {
    if (fromIndex >= shortcuts.length - 1) return;
    const newOrder = [...shortcuts];
    [newOrder[fromIndex], newOrder[fromIndex + 1]] = [newOrder[fromIndex + 1], newOrder[fromIndex]];
    onReorder(newOrder);
  };

  const panel = (
    <>
      <div className={styles.dotRow}>
        {DECORATIVE_DOTS.map((on, i) => (
          <span key={i} className={on ? styles.dot : styles.dotOff} />
        ))}
      </div>
      <div className={styles.container}>
        {shortcuts.length === 0 ? (
          <>
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
          </>
        ) : (
          <>
            {shortcuts.map((shortcut, i) => (
              <ShortcutTile
                key={shortcut.id}
                shortcut={shortcut}
                onDelete={onDelete}
                onUpdate={onUpdate}
                index={i}
                isDragging={dragIndex === i}
                isDragOver={dragOverIndex === i}
                dropPosition={dragIndex !== null && dragOverIndex === i ? dropPosition : null}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMoveLeft={handleMoveLeft}
                onMoveRight={handleMoveRight}
              />
            ))}
            {onAdd && (
              <button className={styles.addTile} onClick={onAdd} aria-label="Add shortcut" title="Add shortcut">
                <span className={styles.addTileIcon}>+</span>
              </button>
            )}
          </>
        )}
      </div>
    </>
  );

  return <div className={`${styles.panel} ${isDraggingAny ? styles.dragActive : ''}`}>{panel}</div>;
}
