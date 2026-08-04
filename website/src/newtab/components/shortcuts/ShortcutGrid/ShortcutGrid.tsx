import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
  type DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Shortcut, getDomainFromUrl } from '../../../utils/storage';
import ShortcutTile from '../ShortcutTile/ShortcutTile';
import { ShortcutIcon } from '../ShortcutIcon';
import { useI18n } from '../../../i18n';
import {
  DEFAULT_GROUP_NAME,
  applyDragEnd,
  buildShortcutGroups,
  flattenShortcutGroups,
  groupStorageKey,
  moveShortcutInFlat,
  normalizeGroupName,
  reorderGroups,
  type DragEndPayload,
  type ShortcutGroup,
} from '../../../utils/shortcuts';
import styles from './ShortcutGrid.module.css';

interface ShortcutGridProps {
  shortcuts: Shortcut[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onReorder: (newOrder: Shortcut[]) => void;
  onAdd?: (group?: string) => void;
  onImportBookmarks?: () => void;
  onImportShortcuts?: () => void;
}

/** Prefix used to namespace group container droppables/sortables so we can
 *  tell a group id apart from a tile id in the drag handlers. */
const GROUP_PREFIX = 'group:';

const isGroupId = (id: string): boolean => id.startsWith(GROUP_PREFIX);

const groupIdOf = (id: string): string => id.slice(GROUP_PREFIX.length);

/** Suffix on group droppables that targets the tiles area (for dropping
 *  a tile into the group, including an empty group). */
const TILES_SUFFIX = '::tiles';

const isTilesDropId = (id: string): boolean => id.endsWith(TILES_SUFFIX);

const tilesDropGroupName = (id: string): string => id.slice(GROUP_PREFIX.length, -TILES_SUFFIX.length);

interface SortableTileProps {
  shortcut: Shortcut;
  isGlobalEditing: boolean;
  isDragging: boolean;
  isGroupPreviewTarget: boolean;
  globalIndex: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  existingGroups: string[];
  onEnterEditMode: () => void;
}

function SortableTile({
  shortcut,
  isGlobalEditing,
  isDragging,
  isGroupPreviewTarget,
  globalIndex,
  onDelete,
  onUpdate,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
  existingGroups,
  onEnterEditMode,
}: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: shortcut.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableItem} ${isSortableDragging ? styles.sortableDragging : ''}`}
      data-shortcut-id={shortcut.id}
      data-group-name={shortcut.group || ''}
      {...attributes}
      {...listeners}
    >
      <ShortcutTile
        shortcut={shortcut}
        onDelete={onDelete}
        onUpdate={onUpdate}
        index={globalIndex}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        existingGroups={existingGroups}
        isGroupPreviewTarget={isGroupPreviewTarget}
        isGlobalEditing={isGlobalEditing}
        isDragging={isDragging}
        onEnterEditMode={onEnterEditMode}
      />
    </div>
  );
}

export default function ShortcutGrid({
  shortcuts,
  onDelete,
  onUpdate,
  onReorder,
  onAdd,
  onImportBookmarks,
  onImportShortcuts,
}: ShortcutGridProps) {
  const { t } = useI18n();
  const groups = useMemo(() => buildShortcutGroups(shortcuts), [shortcuts]);
  const flat = useMemo(() => flattenShortcutGroups(groups), [groups]);
  const groupIds = useMemo(
    () => groups.map((g) => `${GROUP_PREFIX}${g.name}`),
    [groups],
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [renamingGroupName, setRenamingGroupName] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [hoverGroupName, setHoverGroupName] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Records the outcome of the most recent drag. Read on the render that
  // follows `onDragEnd` (triggered by `setActiveDragId(null)`) to pick
  // the right drop animation. A ref (not state) because we don't need
  // to trigger a re-render — the state update from `onDragEnd` already
  // does that, and by the time the next render runs the ref has the
  // fresh value.
  const lastDropSucceededRef = useRef<boolean>(false);

  // Local mirror of the persisted list, ordered the same way the grid
  // visually renders it. dnd-kit reads/writes this directly during a drag,
  // then we hand the result to `onReorder` (which persists). Initializing
  // from `flat` — not the raw `shortcuts` prop — keeps keyboard index math
  // in sync with the rendered order.
  const [items, setItems] = useState<Shortcut[]>(flat);
  useEffect(() => {
    setItems(flat);
  }, [flat]);

  useEffect(() => {
    const el = panelRef.current;
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
    () =>
      Array.from(
        new Set(
          shortcuts
            .map((shortcut) => shortcut.group)
            .filter((group): group is string => !!group),
        ),
      ).sort(),
    [shortcuts],
  );

  const startRenameGroup = (groupName: string) => {
    setRenamingGroupName(groupName);
    setRenameInputValue(groupName === DEFAULT_GROUP_NAME ? '' : groupName);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitGroupRename = (oldName: string, newName: string) => {
    setRenamingGroupName(null);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const target = trimmed === DEFAULT_GROUP_NAME ? undefined : trimmed;
    const renamed = items.map((s) => {
      const g = groupStorageKey(s);
      if (g === oldName) {
        return { ...s, group: target };
      }
      return s;
    });
    onReorder(renamed);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Custom collision detection.
  //
  // dnd-kit's built-in `closestCenter` and `closestCorners` measure the
  // distance from the **active item's** rect — not from the pointer. For
  // a cross-group drag, the active item stays in its source group, so
  // those algorithms always prefer tiles in the source group and the drop
  // never crosses to a different group (this is the "drag only works from
  // later groups to the first group" bug).
  //
  // We instead:
  //   1. Try `pointerWithin` first — the pointer is inside a droppable.
  //      This is the only algorithm that measures from the pointer, so
  //      it correctly resolves cross-group drops.
  //   2. Fall back to a custom "closest to pointer" check when the
  //      pointer is in a gap between tiles (no droppable contains it).
  //      This still measures from the pointer, so a tile in another
  //      group is preferred over a tile in the same group if the pointer
  //      is closer to it.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return pointerClosestCenter(args);
  };

  // dnd-kit has no built-in "closest to pointer" collision detection, so
  // we write one. It measures the Euclidean distance from the pointer to
  // each droppable's center and returns the nearest. This is what makes
  // cross-group drops land correctly: when the active item is in group 1
  // and the pointer is over group 2, the group 2 tile's center is closer
  // to the pointer than any group 1 tile's center.
  function pointerClosestCenter(args: Parameters<CollisionDetection>[0]): ReturnType<CollisionDetection> {
    const { active, droppableContainers, droppableRects, pointerCoordinates } = args;
    // dnd-kit types this as `Coordinates | null` for some collisions
    // (e.g. when the user is keyboard-navigating). Fall back to the
    // active's center in that case so we always return a sensible target.
    const px = pointerCoordinates?.x ?? args.active.rect.current.translated?.left ?? 0;
    const py = pointerCoordinates?.y ?? args.active.rect.current.translated?.top ?? 0;
    let closestId: string | null = null;
    let closestDistance = Infinity;
    for (const container of droppableContainers) {
      if (container.id === active.id) continue;
      const rect = droppableRects.get(container.id);
      if (!rect) continue;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = centerX - px;
      const dy = centerY - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = String(container.id);
      }
    }
    if (closestId === null) return [];
    return [{ id: closestId }];
  }

  // dnd-kit's default `dropAnimation` flies the overlay from the pointer
  // back to the active item's *original* position. That reads as "the
  // tile was put back" for cancelled drops, but for successful drops
  // it's wrong — the tile is already in its new position, so a "fly back
  // to origin" animation lands on an empty spot and then disappears.
  //
  // For successful drops we use a custom animation: stay at the pointer
  // and fade + scale down. The tile appears in its new position via
  // React state, so visually the overlay "lands" where the user
  // released and then the tile is in its final spot.
  //
  // For cancelled drops we keep dnd-kit's default (null) so the overlay
  // flies back to origin — that's the expected "put back" feedback.
  const dropAnimation: DropAnimation | null = lastDropSucceededRef.current
    ? {
        duration: 180,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        keyframes: ({ transform: t }) => {
          // dnd-kit passes `{ initial, final }` transforms. The `final`
          // transform is the one applied during the drop animation; we
          // pin the overlay to `initial` (its current pointer offset)
          // and just fade + scale out.
          const initial = t.initial;
          const base = initial
            ? `translate3d(${initial.x}px, ${initial.y}px, 0) scale(${initial.scaleX})`
            : 'none';
          return [
            { opacity: 1, transform: base },
            { opacity: 0, transform: `${base} scale(0.9)` },
          ];
        },
      }
    : null;

  const activeShortcut = activeDragId && !isGroupId(activeDragId)
    ? items.find((s) => s.id === activeDragId) ?? null
    : null;

  // For group drags, capture the active group's name and a flat list of
  // its tile ids so the preview can render a faithful representation.
  const activeGroupName = activeDragId && isGroupId(activeDragId)
    ? groupIdOf(activeDragId)
    : null;
  const activeGroup = activeGroupName ? groups.find((g) => g.name === activeGroupName) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setHoverGroupName(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setHoverGroupName(null);
      return;
    }
    const overId = String(over.id);
    if (isTilesDropId(overId)) {
      setHoverGroupName(tilesDropGroupName(overId));
    } else if (isGroupId(overId)) {
      setHoverGroupName(groupIdOf(overId));
    } else {
      const overShortcut = items.find((s) => s.id === overId);
      setHoverGroupName(overShortcut ? groupStorageKey(overShortcut) : null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setHoverGroupName(null);
    // Default to "cancelled" so the drop animation defaults to the
    // origin-fly-back behaviour. The branches below set the ref to
    // true when a drop actually changes the state.
    lastDropSucceededRef.current = false;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // ── Group reorder ───────────────────────────────────────────
    // The group card itself uses `useSortable` with id `group:NAME`. The
    // group tiles area uses `useDroppable` with id `group:NAME::tiles`.
    // Only the former is sortable — the latter is purely a drop target
    // for tiles.
    if (isGroupId(activeId) && !isTilesDropId(activeId)) {
      if (!isGroupId(overId) || isTilesDropId(overId)) return;
      const fromGroup = groupIdOf(activeId);
      const toGroup = groupIdOf(overId);
      if (fromGroup === toGroup) return;
      const currentGroupOrder = groups.map((g) => g.name);
      const fromIdx = currentGroupOrder.indexOf(fromGroup);
      const toIdx = currentGroupOrder.indexOf(toGroup);
      if (fromIdx === -1 || toIdx === -1) return;
      const nextOrder = [...currentGroupOrder];
      nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, fromGroup);
      const result = reorderGroups(items, nextOrder);
      if (result) {
        setItems(result);
        onReorder(result);
        lastDropSucceededRef.current = true;
      }
      return;
    }

    // ── Tile move ───────────────────────────────────────────────
    const activeShortcut = items.find((s) => s.id === activeId);
    if (!activeShortcut) return;
    const sourceGroup = groupStorageKey(activeShortcut);

    let payload: DragEndPayload | null = null;

    if (isTilesDropId(overId)) {
      // Dropped onto a group's tiles area (possibly empty). Move into
      // that group; the reducer handles the default-group clearing.
      const destGroup = tilesDropGroupName(overId);
      payload = { activeId, overId: null, sourceGroup, destGroup, merge: false };
    } else {
      const overShortcut = items.find((s) => s.id === overId);
      if (!overShortcut) return;
      const destGroup = groupStorageKey(overShortcut);
      const isCross = sourceGroup !== destGroup;
      const isDropOnUngrouped =
        !normalizeGroupName(overShortcut.group) && !normalizeGroupName(activeShortcut.group);
      const merge = isCross || isDropOnUngrouped;
      payload = { activeId, overId, sourceGroup, destGroup, merge };
    }

    if (!payload) return;

    const result = applyDragEnd(items, payload);
    if (result) {
      setItems(result);
      onReorder(result);
      lastDropSucceededRef.current = true;
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setHoverGroupName(null);
    // Cancelled → use the default "fly back to origin" animation.
    lastDropSucceededRef.current = false;
  };

  // ── Keyboard reorder ───────────────────────────────────────
  const moveBy = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (toIndex < 0 || toIndex >= items.length) return;
    const next = moveShortcutInFlat(items, fromIndex, toIndex);
    setItems(next);
    onReorder(next);
  };

  const groupStartIndices = (() => {
    const out: Record<string, number> = {};
    let cursor = 0;
    for (const group of groups) {
      out[group.name] = cursor;
      cursor += group.shortcuts.length;
    }
    return out;
  })();

  const handleMoveLeft = (fromIndex: number) => {
    const fromGroup = groupStorageKey(items[fromIndex]);
    const start = groupStartIndices[fromGroup];
    if (fromIndex === start) {
      const groupIdx = groups.findIndex((g) => g.name === fromGroup);
      if (groupIdx <= 0) return;
      moveBy(fromIndex, start - 1);
      return;
    }
    moveBy(fromIndex, fromIndex - 1);
  };

  const handleMoveRight = (fromIndex: number) => {
    const fromGroup = groupStorageKey(items[fromIndex]);
    const start = groupStartIndices[fromGroup];
    const end = start + (groups.find((g) => g.name === fromGroup)?.shortcuts.length ?? 0) - 1;
    if (fromIndex === end) {
      const groupIdx = groups.findIndex((g) => g.name === fromGroup);
      if (groupIdx === -1 || groupIdx === groups.length - 1) return;
      moveBy(fromIndex, end + 1);
      return;
    }
    moveBy(fromIndex, fromIndex + 1);
  };

  const handleMoveUp = (fromIndex: number) => {
    const cols = Math.max(1, Math.floor(containerWidth / 108));
    moveBy(fromIndex, fromIndex - cols);
  };

  const handleMoveDown = (fromIndex: number) => {
    const cols = Math.max(1, Math.floor(containerWidth / 108));
    moveBy(fromIndex, fromIndex + cols);
  };

  const globalIndex = (shortcutId: string) => items.findIndex((s) => s.id === shortcutId);

  useEffect(() => {
    if (!isGlobalEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGlobalEditing(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isGlobalEditing]);

  return (
    <div
      className={`${styles.panel} ${activeDragId ? styles.dragActive : ''}`}
      ref={panelRef}
    >
      {shortcuts.length > 0 && (
        <div className={styles.headerRow}>
          <span className={styles.headerTitle}>{t('shortcutsTitle')}</span>
          <button
            className={`${styles.editBtn} ${isGlobalEditing ? styles.editBtnActive : ''}`}
            title={isGlobalEditing ? t('done') : t('edit')}
            onClick={() => setIsGlobalEditing((prev) => !prev)}
          >
            {isGlobalEditing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            )}
            {isGlobalEditing ? t('done') : t('edit')}
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <div className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>{t('noShortcutsTitle')}</div>
            <div className={styles.emptyHint} style={{ marginTop: 8, opacity: 0.7 }}>
              {t('noShortcutsHint')}
            </div>
            <div className={styles.emptyActions}>
              {onAdd && (
                <button className={styles.emptyAddBtn} onClick={() => onAdd()} tabIndex={0}>
                  <span className={styles.emptyAddBtnIcon}>+</span>
                  {t('addShortcut')}
                </button>
              )}
              {onImportBookmarks && (
                <button className={styles.emptySecondaryBtn} onClick={onImportBookmarks} tabIndex={0}>
                  {t('importBookmarks')}
                </button>
              )}
              {onImportShortcuts && (
                <button className={styles.emptySecondaryBtn} onClick={onImportShortcuts} tabIndex={0}>
                  {t('importJson')}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={groupIds} strategy={rectSortingStrategy}>
            <div className={styles.cardsRow}>
              {groups.map((group) => (
                <GroupSection
                  key={group.name}
                  group={group}
                  showHeader={groups.length > 1}
                  renamingGroupName={renamingGroupName}
                  renameInputValue={renameInputValue}
                  renameInputRef={renameInputRef}
                  setRenameInputValue={setRenameInputValue}
                  startRenameGroup={startRenameGroup}
                  commitGroupRename={commitGroupRename}
                  setRenamingGroupName={setRenamingGroupName}
                  isGlobalEditing={isGlobalEditing}
                  activeDragId={activeDragId}
                  hoverGroupName={hoverGroupName}
                  globalIndex={globalIndex}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onMoveLeft={handleMoveLeft}
                  onMoveRight={handleMoveRight}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  existingGroups={existingGroups}
                  onAdd={onAdd}
                  onEnterEditMode={() => setIsGlobalEditing(true)}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeShortcut ? (
              <TileDragPreview shortcut={activeShortcut} />
            ) : activeGroup ? (
              <GroupDragPreview group={activeGroup} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

// ── Lightweight drag previews ────────────────────────────────────────
// Rendering the full ShortcutTile inside DragOverlay caused the icon to
// disappear in some layouts — the tile's aspect-ratio/positioning
// collapses inside the portal. A purpose-built preview with explicit
// dimensions always renders correctly.

export function TileDragPreview({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className={styles.dragPreview} data-testid="tile-drag-preview">
      <div className={styles.dragPreviewInner}>
        <div className={styles.dragPreviewIconWell}>
          <ShortcutIcon
            url={shortcut.url}
            favicon={shortcut.favicon}
            title={shortcut.title}
            size="lg"
            className={styles.dragPreviewIcon}
          />
        </div>
        <div className={styles.dragPreviewTitle}>{shortcut.title}</div>
        {!shortcut.group && <div className={styles.dragPreviewDomain}>{getDomainFromUrl(shortcut.url)}</div>}
      </div>
    </div>
  );
}

export function GroupDragPreview({ group }: { group: ShortcutGroup }) {
  return (
    <div className={styles.groupDragPreview} data-testid="group-drag-preview">
      <div className={styles.groupDragPreviewHeader}>
        <span className={styles.groupName}>{group.name}</span>
        <span className={styles.groupCount}>({group.shortcuts.length})</span>
      </div>
      <div className={styles.groupDragPreviewTiles}>
        {group.shortcuts.slice(0, 8).map((s) => (
          <div key={s.id} className={styles.groupDragPreviewTile}>
            <ShortcutIcon
              url={s.url}
              favicon={s.favicon}
              title={s.title}
              size="sm"
              className={styles.dragPreviewIcon}
            />
          </div>
        ))}
        {group.shortcuts.length > 8 && (
          <div className={styles.groupDragPreviewMore}>+{group.shortcuts.length - 8}</div>
        )}
      </div>
    </div>
  );
}

interface GroupSectionProps {
  group: ShortcutGroup;
  showHeader: boolean;
  renamingGroupName: string | null;
  renameInputValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  setRenameInputValue: (v: string) => void;
  startRenameGroup: (name: string) => void;
  commitGroupRename: (old: string, next: string) => void;
  setRenamingGroupName: (name: string | null) => void;
  isGlobalEditing: boolean;
  activeDragId: string | null;
  hoverGroupName: string | null;
  globalIndex: (id: string) => number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  existingGroups: string[];
  onAdd?: (group?: string) => void;
  onEnterEditMode: () => void;
  t: (key: any, vars?: Record<string, string | number>) => string;
}

function GroupSection({
  group,
  showHeader,
  renamingGroupName,
  renameInputValue,
  renameInputRef,
  setRenameInputValue,
  startRenameGroup,
  commitGroupRename,
  setRenamingGroupName,
  isGlobalEditing,
  activeDragId,
  hoverGroupName,
  globalIndex,
  onDelete,
  onUpdate,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
  existingGroups,
  onAdd,
  onEnterEditMode,
  t,
}: GroupSectionProps) {
  const isHover = hoverGroupName === group.name && activeDragId !== null;
  const ids = useMemo(() => group.shortcuts.map((s) => s.id), [group.shortcuts]);

  // Group card is a sortable item so the whole card can be dragged by its
  // header. The header is the drag handle — see the JSX below. We use a
  // plain `useSortable` here (not also `useDroppable` with the same id —
  // dnd-kit rejects duplicate droppable ids and would silently drop one
  // registration, breaking either the group reorder or the drop target).
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isGroupDragging,
  } = useSortable({ id: `${GROUP_PREFIX}${group.name}` });

  // The inner `.groupTiles` area is a separate droppable with its own id
  // (the group's sortable id is reserved for group reordering). This makes
  // the empty space of a group — and a group with only one tile — a valid
  // drop target for a dragged tile. Without this, dragging a tile into an
  // empty group would only land if the pointer happened to overlap one of
  // the group's existing tiles.
  const { setNodeRef: setTilesDropRef, isOver: isTilesDropOver } = useDroppable({
    id: `${GROUP_PREFIX}${group.name}::tiles`,
  });

  const groupStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={groupStyle}
      className={`glass-card ${styles.groupSection} ${isHover || isTilesDropOver ? styles.groupSectionOver : ''} ${isGroupDragging ? styles.groupDragging : ''}`}
      data-group-name={group.name}
    >
      {showHeader && (
        <div
          className={`${styles.groupHeader} ${styles.groupHeaderHandle}`}
          onClick={() => renamingGroupName !== group.name && startRenameGroup(group.name)}
          {...attributes}
          {...listeners}
        >
          {renamingGroupName === group.name ? (
            <input
              ref={renameInputRef}
              className={styles.groupRenameInput}
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitGroupRename(group.name, renameInputValue);
                if (e.key === 'Escape') setRenamingGroupName(null);
              }}
              onBlur={() => commitGroupRename(group.name, renameInputValue)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder={t('groupRenamePlaceholder')}
              maxLength={30}
            />
          ) : (
            <>
              <span className={styles.groupName} title={group.name}>{group.name}</span>
              <span className={styles.groupCount}>({group.shortcuts.length})</span>
              <span className={styles.groupDragHint} aria-hidden="true">⋮⋮</span>
            </>
          )}
        </div>
      )}
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div
          ref={setTilesDropRef}
          className={styles.groupTiles}
          data-group-name={group.name}
        >
          {group.shortcuts.map((shortcut) => (
            <SortableTile
              key={shortcut.id}
              shortcut={shortcut}
              isGlobalEditing={isGlobalEditing}
              isDragging={activeDragId === shortcut.id}
              isGroupPreviewTarget={activeDragId === null && false}
              globalIndex={globalIndex(shortcut.id)}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onMoveLeft={onMoveLeft}
              onMoveRight={onMoveRight}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              existingGroups={existingGroups}
              onEnterEditMode={onEnterEditMode}
            />
          ))}
          {onAdd && (
            <button
              className={styles.addTile}
              onClick={() => onAdd(group.name === DEFAULT_GROUP_NAME ? undefined : group.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onAdd(group.name === DEFAULT_GROUP_NAME ? undefined : group.name);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              tabIndex={0}
              aria-label={t('addShortcutAria')}
              title={t('addShortcut')}
            >
              <span className={styles.addTileIcon}>+</span>
              <span className={styles.addTileLabel}>{t('addWebsite')}</span>
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
