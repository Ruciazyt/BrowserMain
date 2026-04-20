import { useMemo, useRef, useState, useEffect } from 'react';
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

type ShortcutGroup = { name: string; shortcuts: Shortcut[] };

function groupStorageKey(s: Shortcut): string {
  const g = s.group?.trim();
  return g ? g : 'Default';
}

/** 按组聚合；组顺序由组内最小 order 决定 */
function buildShortcutGroups(shortcuts: Shortcut[]): ShortcutGroup[] {
  const map = new Map<string, Shortcut[]>();
  for (const s of shortcuts) {
    const key = groupStorageKey(s);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const minOf = (k: string) => Math.min(...map.get(k)!.map((x) => x.order));
    return minOf(a) - minOf(b) || a.localeCompare(b);
  });
  return keys.map((name) => ({ name, shortcuts: map.get(name)! }));
}

function flattenShortcutGroups(groups: ShortcutGroup[]): Shortcut[] {
  return groups.flatMap((g) => g.shortcuts);
}

function SortableShortcutWrap({
  shortcut,
  index,
  onDelete,
  onUpdate,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
  onAdd,
  existingGroups,
}: {
  shortcut: Shortcut;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onAdd?: () => void;
  existingGroups: string[];
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
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAdd={onAdd}
        existingGroups={existingGroups}
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

  const groups = useMemo(() => buildShortcutGroups(shortcuts), [shortcuts]);
  const flat = useMemo(() => flattenShortcutGroups(groups), [groups]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const existingGroups = useMemo(
    () => Array.from(new Set(shortcuts.map((s) => s.group).filter((g): g is string => !!g))).sort(),
    [shortcuts]
  );

  const applyFlatReorder = (newFlat: Shortcut[], movedId: string, adoptGroupFrom: Shortcut) => {
    const g = adoptGroupFrom.group;
    const nextGroup = g && g.trim() ? g.trim() : undefined;
    const merged = newFlat.map((s, i) =>
      s.id === movedId ? { ...s, order: i, group: nextGroup } : { ...s, order: i }
    );
    onReorder(merged);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = flat.findIndex((s) => s.id === active.id);
    const newIndex = flat.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const overShortcut = flat[newIndex];
    const newFlat = arrayMove(flat, oldIndex, newIndex);
    applyFlatReorder(newFlat, active.id as string, overShortcut);
  };

  const handleMoveLeft = (fromIndex: number) => {
    if (fromIndex <= 0) return;
    // Compute group start indices
    const groupStartIndices = groups.map((g) =>
      groups.slice(0, groups.indexOf(g)).reduce((acc, g2) => acc + g2.shortcuts.length, 0)
    );
    // At first item of a non-first group → wrap to previous group's last item
    if (fromIndex === groupStartIndices[0]) return; // can't wrap further left
    const isFirstInGroup = groupStartIndices.some((start, i) => fromIndex === start && i > 0);
    let targetIndex: number;
    if (isFirstInGroup) {
      const groupIdx = groupStartIndices.findIndex((s) => s === fromIndex);
      targetIndex = groupStartIndices[groupIdx - 1] + groups[groupIdx - 1].shortcuts.length - 1;
    } else {
      targetIndex = fromIndex - 1;
    }
    const neighbor = flat[targetIndex];
    const movedId = flat[fromIndex].id;
    const newFlat = arrayMove(flat, fromIndex, targetIndex);
    applyFlatReorder(newFlat, movedId, neighbor);
  };

  const handleMoveRight = (fromIndex: number) => {
    if (fromIndex >= flat.length - 1) return;
    // Compute group start indices
    const groupStartIndices = groups.map((g) =>
      groups.slice(0, groups.indexOf(g)).reduce((acc, g2) => acc + g2.shortcuts.length, 0)
    );
    const lastGroupStart = groupStartIndices[groups.length - 1];
    const lastGroupLength = groups[groups.length - 1].shortcuts.length;
    const lastItemIndex = lastGroupStart + lastGroupLength - 1;
    // At last item of last group → stay (no wrap to add button via keyboard reorder)
    if (fromIndex >= lastItemIndex) return;
    // At last item of a non-last group → wrap to next group's first item
    const isLastInGroup = groupStartIndices.map((start, i) => ({
      start,
      end: start + groups[i].shortcuts.length - 1,
      idx: i,
    })).some(({ start, end, idx }) => fromIndex === end && idx < groups.length - 1);
    let targetIndex: number;
    if (isLastInGroup) {
      const groupInfo = groupStartIndices
        .map((start, i) => ({ start, end: start + groups[i].shortcuts.length - 1, idx: i }))
        .find(({ start, end, idx }) => fromIndex === end && idx < groups.length - 1)!;
      targetIndex = groupInfo.start + groups[groupInfo.idx + 1].shortcuts.length;
    } else {
      targetIndex = fromIndex + 1;
    }
    const neighbor = flat[targetIndex];
    const movedId = flat[fromIndex].id;
    const newFlat = arrayMove(flat, fromIndex, targetIndex);
    applyFlatReorder(newFlat, movedId, neighbor);
  };

  const handleMoveUp = (fromIndex: number) => {
    const TILE_MIN_WIDTH = 96;
    const TILE_GAP = 12;
    const estimatedColumns = Math.max(1, Math.floor(containerWidth / (TILE_MIN_WIDTH + TILE_GAP)));
    const targetIndex = fromIndex - estimatedColumns;
    if (targetIndex < 0) return;
    const neighbor = flat[targetIndex];
    const movedId = flat[fromIndex].id;
    const newFlat = arrayMove(flat, fromIndex, targetIndex);
    applyFlatReorder(newFlat, movedId, neighbor);
  };

  const handleMoveDown = (fromIndex: number) => {
    const TILE_MIN_WIDTH = 96;
    const TILE_GAP = 12;
    const estimatedColumns = Math.max(1, Math.floor(containerWidth / (TILE_MIN_WIDTH + TILE_GAP)));
    const targetIndex = fromIndex + estimatedColumns;
    if (targetIndex >= flat.length) return;
    const neighbor = flat[targetIndex];
    const movedId = flat[fromIndex].id;
    const newFlat = arrayMove(flat, fromIndex, targetIndex);
    applyFlatReorder(newFlat, movedId, neighbor);
  };

  const globalIndex = (shortcutId: string) => flat.findIndex((s) => s.id === shortcutId);

  const panel = (
    <>
      <div className={styles.cardTitle}>快捷入口</div>
      {shortcuts.length > 0 && (
        <div className={styles.headerRow}>
          <span />
          <span className={styles.count}>
            ({shortcuts.length} shortcuts{groups.length > 1 ? ` · ${groups.length} groups` : ''})
          </span>
          <span className={styles.hint}>right-click to edit</span>
        </div>
      )}
      {shortcuts.length === 0 ? (
        <div className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No shortcuts yet</div>
            <div className={styles.emptyHint} style={{ marginTop: 8, opacity: 0.7 }}>
              Right-click any shortcut to edit or delete
            </div>
            {onAdd && (
              <button className={styles.emptyAddBtn} onClick={onAdd} tabIndex={0}>
                <span className={styles.emptyAddBtnIcon}>+</span>
                Add Shortcut
              </button>
            )}
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {groups.map((group, gi) => (
            <div key={group.name} className={styles.groupSection}>
              {groups.length > 1 && (
                <div className={styles.groupHeader}>
                  <span className={styles.groupName}>{group.name}</span>
                  <span className={styles.groupCount}>({group.shortcuts.length})</span>
                </div>
              )}
              <SortableContext items={group.shortcuts.map((s) => s.id)} strategy={rectSortingStrategy}>
                <div className={styles.groupTiles}>
                  {group.shortcuts.map((shortcut) => (
                    <SortableShortcutWrap
                      key={shortcut.id}
                      shortcut={shortcut}
                      index={globalIndex(shortcut.id)}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      onMoveLeft={handleMoveLeft}
                      onMoveRight={handleMoveRight}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onAdd={onAdd}
                      existingGroups={existingGroups}
                    />
                  ))}
                  {onAdd && gi === groups.length - 1 && (
                    <button className={styles.addTile} onClick={onAdd} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd?.(); } }} tabIndex={0} aria-label="Add shortcut" title="Add shortcut">
                      <span className={styles.addTileIcon}>+</span>
                    </button>
                  )}
                </div>
              </SortableContext>
            </div>
          ))}
        </DndContext>
      )}
    </>
  );

  return <div className={styles.panel} ref={containerRef}>{panel}</div>;
}
