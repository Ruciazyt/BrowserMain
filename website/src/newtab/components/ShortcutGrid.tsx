import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

function SortableShortcutWrap({
  shortcut,
  index,
  onDelete,
  onUpdate,
  onMoveLeft,
  onMoveRight,
}: {
  shortcut: Shortcut;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shortcut.id,
  });

  const style: CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: transition
      ? `${transition}, box-shadow 180ms ease, opacity 180ms ease`
      : undefined,
    opacity: isDragging ? 0.72 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
    boxShadow: isDragging ? '0 16px 36px rgba(0, 0, 0, 0.45)' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className={styles.sortableItem}
      style={style}
      {...attributes}
      {...listeners}
    >
      <ShortcutTile
        shortcut={shortcut}
        onDelete={onDelete}
        onUpdate={onUpdate}
        index={index}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
      />
    </div>
  );
}

export default function ShortcutGrid({ shortcuts, onDelete, onUpdate, onReorder, onAdd }: ShortcutGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = shortcuts.findIndex((s) => s.id === active.id);
    const newIndex = shortcuts.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(shortcuts, oldIndex, newIndex));
  };

  const handleMoveLeft = (fromIndex: number) => {
    if (fromIndex <= 0) return;
    onReorder(arrayMove(shortcuts, fromIndex, fromIndex - 1));
  };

  const handleMoveRight = (fromIndex: number) => {
    if (fromIndex >= shortcuts.length - 1) return;
    onReorder(arrayMove(shortcuts, fromIndex, fromIndex + 1));
  };

  const panel = (
    <>
      <div className={styles.cardTitle}>快捷入口</div>
      {shortcuts.length === 0 ? (
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
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={shortcuts.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className={styles.container}>
              {shortcuts.map((shortcut, i) => (
                <SortableShortcutWrap
                  key={shortcut.id}
                  shortcut={shortcut}
                  index={i}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onMoveLeft={handleMoveLeft}
                  onMoveRight={handleMoveRight}
                />
              ))}
              {onAdd && (
                <button className={styles.addTile} onClick={onAdd} aria-label="Add shortcut" title="Add shortcut">
                  <span className={styles.addTileIcon}>+</span>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  );

  return <div className={styles.panel}>{panel}</div>;
}
