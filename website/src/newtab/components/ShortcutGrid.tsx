<<<<<<< HEAD
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
=======
import { useState, useMemo } from 'react';
>>>>>>> 719059899cef841cb006f7c36bfcc1629f6750ad
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

<<<<<<< HEAD
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
=======
interface Group {
  name: string; // 'Default' for undefined/null group
  shortcuts: Shortcut[];
>>>>>>> 719059899cef841cb006f7c36bfcc1629f6750ad
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

<<<<<<< HEAD
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = shortcuts.findIndex((s) => s.id === active.id);
    const newIndex = shortcuts.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(shortcuts, oldIndex, newIndex));
=======
  // All existing group names for autocomplete suggestions
  const existingGroups = useMemo(() =>
    Array.from(new Set(shortcuts.map(s => s.group).filter((g): g is string => !!g))).sort(),
    [shortcuts]
  );

  // Group shortcuts: undefined/null group → 'Default'
  const groups = useMemo<Group[]>(() => {
    const groupMap = new Map<string, Shortcut[]>();
    for (const s of shortcuts) {
      const key = s.group || 'Default';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(s);
    }
    // Sort groups by first shortcut's order
    const sorted = Array.from(groupMap.entries())
      .sort(([aName, aShortcuts], [bName, bShortcuts]) => {
        const aFirst = aShortcuts[0]?.order ?? Infinity;
        const bFirst = bShortcuts[0]?.order ?? Infinity;
        return aFirst - bFirst;
      });
    // Within each group sort by order
    return sorted.map(([name, groupShortcuts]) => ({
      name,
      shortcuts: [...groupShortcuts].sort((a, b) => a.order - b.order),
    }));
  }, [shortcuts]);

  // Global shortcut index for drag (across all groups)
  const globalIndex = (groupIdx: number, shortcutIdx: number) => {
    let idx = 0;
    for (let g = 0; g < groupIdx; g++) idx += groups[g].shortcuts.length;
    return idx + shortcutIdx;
  };

  const handleDragStart = (groupIdx: number, shortcutIdx: number) => {
    setDragIndex(globalIndex(groupIdx, shortcutIdx));
    setIsDraggingAny(true);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    setIsDraggingAny(false);
  };

  const handleDragOver = (groupIdx: number, shortcutIdx: number, offsetX: number, tileWidth: number) => {
    setDragOverIndex(globalIndex(groupIdx, shortcutIdx));
    setDropPosition(offsetX < tileWidth / 2 ? 'before' : 'after');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      handleDragEnd();
      return;
    }
    const insertIndex = (() => {
      if (dropPosition === 'after') {
        return dragIndex < dragOverIndex ? dragOverIndex : dragOverIndex + 1;
      }
      return dragIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex;
    })();
    const newOrder = [...shortcuts];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(insertIndex, 0, removed);
    onReorder(newOrder);
    handleDragEnd();
>>>>>>> 719059899cef841cb006f7c36bfcc1629f6750ad
  };

  // ShortcutTile calls onMoveLeft/onMoveRight with global index (the tile's global index prop)
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
<<<<<<< HEAD
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
=======
      <div className={styles.dotRow}>
        {DECORATIVE_DOTS.map((on, i) => (
          <span key={i} className={on ? styles.dot : styles.dotOff} />
        ))}
      </div>
      {shortcuts.length > 0 && (
        <div className={styles.header}>
          <span />
          <span className={styles.count}>({shortcuts.length} shortcuts{groups.length > 1 ? ` · ${groups.length} groups` : ''})</span>
          <span className={styles.hint}>right-click to edit</span>
        </div>
      )}
      <div className={styles.container}>
        {shortcuts.length === 0 ? (
          <>
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No shortcuts yet</div>
              <div className={styles.emptyHint}>
                Click the <strong style={{ color: 'var(--led-amber)' }}>+</strong> button to add your first shortcut
              </div>
              <div className={styles.emptyHint} style={{ marginTop: 4 }}>
                Right-click any shortcut to edit or delete
              </div>
>>>>>>> 719059899cef841cb006f7c36bfcc1629f6750ad
              {onAdd && (
                <button className={styles.addTile} onClick={onAdd} aria-label="Add shortcut" title="Add shortcut">
                  <span className={styles.addTileIcon}>+</span>
                </button>
              )}
            </div>
<<<<<<< HEAD
          </SortableContext>
        </DndContext>
      )}
=======
          </>
        ) : (
          <>
            {groups.map((group, gi) => (
              <div key={group.name} className={styles.groupSection}>
                {/* Group header */}
                {groups.length > 1 && (
                  <div className={styles.groupHeader}>
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupCount}>({group.shortcuts.length})</span>
                  </div>
                )}
                {/* Shortcuts in this group */}
                <div className={styles.groupTiles}>
                  {group.shortcuts.map((shortcut, si) => {
                    const globalIdx = globalIndex(gi, si);
                    return (
                      <ShortcutTile
                        key={shortcut.id}
                        shortcut={shortcut}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        index={globalIdx}
                        isDragging={dragIndex === globalIdx}
                        isDragOver={dragOverIndex === globalIdx}
                        dropPosition={dragIndex !== null && dragOverIndex === globalIdx ? dropPosition : null}
                        onDragStart={() => handleDragStart(gi, si)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(idx, ox, tw) => handleDragOver(gi, si, ox, tw)}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onMoveLeft={() => handleMoveLeft(globalIdx)}
                        onMoveRight={() => handleMoveRight(globalIdx)}
                        existingGroups={existingGroups}
                      />
                    );
                  })}
                  {/* Add button at bottom of last group */}
                  {onAdd && gi === groups.length - 1 && (
                    <button className={styles.addTile} onClick={onAdd} aria-label="Add shortcut" title="Add shortcut">
                      <span className={styles.addTileIcon}>+</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
>>>>>>> 719059899cef841cb006f7c36bfcc1629f6750ad
    </>
  );

  return <div className={styles.panel}>{panel}</div>;
}
