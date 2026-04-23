import { useMemo, useRef, useState, useEffect } from 'react';
import Sortable, { type MoveEvent, type SortableEvent } from 'sortablejs';
import { Shortcut } from '../utils/storage';
import ShortcutTile from './ShortcutTile';
import { useI18n } from '../i18n';
import styles from '../styles/components/ShortcutGrid.module.css';

interface ShortcutGridProps {
  shortcuts: Shortcut[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shortcut>) => void;
  onReorder: (newOrder: Shortcut[]) => void;
  onAdd?: () => void;
  onImportBookmarks?: () => void;
  onImportShortcuts?: () => void;
}

type ShortcutGroup = { name: string; shortcuts: Shortcut[] };

function groupStorageKey(shortcut: Shortcut): string {
  const group = shortcut.group?.trim();
  return group ? group : 'Default';
}

function buildShortcutGroups(shortcuts: Shortcut[]): ShortcutGroup[] {
  const map = new Map<string, Shortcut[]>();
  for (const shortcut of shortcuts) {
    const key = groupStorageKey(shortcut);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(shortcut);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const minOf = (key: string) => Math.min(...map.get(key)!.map((item) => item.order));
    return minOf(a) - minOf(b) || a.localeCompare(b);
  });
  return keys.map((name) => ({ name, shortcuts: map.get(name)! }));
}

function flattenShortcutGroups(groups: ShortcutGroup[]): Shortcut[] {
  return groups.flatMap((group) => group.shortcuts);
}

function normalizeGroupName(name?: string): string | undefined {
  const trimmed = name?.trim();
  return trimmed ? trimmed : undefined;
}

function createUniqueGroupName(baseName: string, existingGroups: string[]): string {
  const normalizedBase = baseName.trim() || 'Group';
  const used = new Set(existingGroups.map((group) => group.trim().toLowerCase()));
  if (!used.has(normalizedBase.toLowerCase())) return normalizedBase;
  let index = 2;
  while (used.has(`${normalizedBase} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${normalizedBase} ${index}`;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
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
  isGroupPreviewTarget,
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
  isGroupPreviewTarget?: boolean;
}) {
  return (
    <div
      className={styles.sortableItem}
      data-shortcut-id={shortcut.id}
      data-group-name={shortcut.group || ''}
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
        isGroupPreviewTarget={isGroupPreviewTarget}
      />
    </div>
  );
}

export default function ShortcutGrid({ shortcuts, onDelete, onUpdate, onReorder, onAdd, onImportBookmarks, onImportShortcuts }: ShortcutGridProps) {
  const { t } = useI18n();
  const groups = useMemo(() => buildShortcutGroups(shortcuts), [shortcuts]);
  const flat = useMemo(() => flattenShortcutGroups(groups), [groups]);

  const panelRef = useRef<HTMLDivElement>(null);
  const groupContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sortableInstancesRef = useRef<Sortable[]>([]);
  const groupIntentTimerRef = useRef<number | null>(null);
  const groupIntentCandidateRef = useRef<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  const [containerWidth, setContainerWidth] = useState(600);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [groupPreviewTargetId, setGroupPreviewTargetId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
    () => Array.from(new Set(shortcuts.map((shortcut) => shortcut.group).filter((group): group is string => !!group))).sort(),
    [shortcuts]
  );

  const clearGroupIntent = () => {
    if (groupIntentTimerRef.current !== null) {
      window.clearTimeout(groupIntentTimerRef.current);
      groupIntentTimerRef.current = null;
    }
    groupIntentCandidateRef.current = null;
    dropTargetIdRef.current = null;
    setGroupPreviewTargetId(null);
  };

  const resetDragState = () => {
    clearGroupIntent();
    setActiveDragId(null);
    setDragActive(false);
  };

  const buildOrderFromDom = (): string[] => {
    return groups.flatMap((group) => {
      const container = groupContainerRefs.current[group.name];
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>('[data-shortcut-id]'))
        .map((node) => node.dataset.shortcutId || '')
        .filter(Boolean);
    });
  };

  const applyOrderedIds = (orderedIds: string[]) => {
    if (orderedIds.length !== flat.length) return;
    const shortcutMap = new Map(flat.map((shortcut) => [shortcut.id, shortcut]));
    const merged = orderedIds.reduce<Shortcut[]>((acc, id, index) => {
      const shortcut = shortcutMap.get(id);
      if (!shortcut) return acc;
      const container = groups
        .map((group) => groupContainerRefs.current[group.name])
        .find((node) => node?.querySelector(`[data-shortcut-id="${id}"]`));
      const groupName = container?.dataset.groupName;
      acc.push({
        ...shortcut,
        order: index,
        group: groupName === 'Default' ? undefined : normalizeGroupName(groupName),
      });
      return acc;
    }, []);

    if (merged.length === flat.length) {
      onReorder(merged);
    }
  };

  const applyGroupMerge = (activeId: string, overId: string) => {
    const activeShortcut = flat.find((shortcut) => shortcut.id === activeId);
    const overShortcut = flat.find((shortcut) => shortcut.id === overId);
    if (!activeShortcut || !overShortcut) return;

    const targetGroup = normalizeGroupName(overShortcut.group)
      || createUniqueGroupName(overShortcut.title.trim() || t('defaultGroupName'), existingGroups);

    const orderedIds = buildOrderFromDom();
    if (orderedIds.length !== flat.length) return;

    const shortcutMap = new Map(flat.map((shortcut) => [shortcut.id, shortcut]));
    const merged = orderedIds.map((id, index) => {
      const shortcut = shortcutMap.get(id)!;
      if (id === activeId || id === overId) {
        return { ...shortcut, order: index, group: targetGroup };
      }
      return { ...shortcut, order: index };
    });

    onReorder(merged);
  };

  const applyKeyboardReorder = (newFlat: Shortcut[], movedId: string, neighbor?: Shortcut) => {
    const nextGroup = normalizeGroupName(neighbor?.group);
    onReorder(newFlat.map((shortcut, index) => (
      shortcut.id === movedId
        ? { ...shortcut, order: index, group: nextGroup }
        : { ...shortcut, order: index }
    )));
  };

  const handleMoveLeft = (fromIndex: number) => {
    if (fromIndex <= 0) return;
    const groupStartIndices = groups.map((group) =>
      groups.slice(0, groups.indexOf(group)).reduce((acc, item) => acc + item.shortcuts.length, 0)
    );
    if (fromIndex === groupStartIndices[0]) return;
    const isFirstInGroup = groupStartIndices.some((start, index) => fromIndex === start && index > 0);
    const targetIndex = isFirstInGroup
      ? groupStartIndices[groupStartIndices.findIndex((start) => start === fromIndex) - 1] + groups[groupStartIndices.findIndex((start) => start === fromIndex) - 1].shortcuts.length - 1
      : fromIndex - 1;
    const newFlat = moveItem(flat, fromIndex, targetIndex);
    applyKeyboardReorder(newFlat, flat[fromIndex].id, newFlat[targetIndex]);
  };

  const handleMoveRight = (fromIndex: number) => {
    if (fromIndex >= flat.length - 1) return;
    const groupStartIndices = groups.map((group) =>
      groups.slice(0, groups.indexOf(group)).reduce((acc, item) => acc + item.shortcuts.length, 0)
    );
    const lastGroupStart = groupStartIndices[groups.length - 1];
    const lastItemIndex = lastGroupStart + groups[groups.length - 1].shortcuts.length - 1;
    if (fromIndex >= lastItemIndex) return;
    const isLastInGroup = groupStartIndices
      .map((start, index) => ({ start, end: start + groups[index].shortcuts.length - 1, idx: index }))
      .some(({ end, idx }) => fromIndex === end && idx < groups.length - 1);
    let targetIndex = fromIndex + 1;
    if (isLastInGroup) {
      const groupInfo = groupStartIndices
        .map((start, index) => ({ start, end: start + groups[index].shortcuts.length - 1, idx: index }))
        .find(({ end, idx }) => fromIndex === end && idx < groups.length - 1)!;
      targetIndex = groupInfo.start + groups[groupInfo.idx + 1].shortcuts.length;
    }
    const newFlat = moveItem(flat, fromIndex, targetIndex);
    applyKeyboardReorder(newFlat, flat[fromIndex].id, newFlat[targetIndex]);
  };

  const handleMoveUp = (fromIndex: number) => {
    const estimatedColumns = Math.max(1, Math.floor(containerWidth / 108));
    const targetIndex = fromIndex - estimatedColumns;
    if (targetIndex < 0) return;
    const newFlat = moveItem(flat, fromIndex, targetIndex);
    applyKeyboardReorder(newFlat, flat[fromIndex].id, newFlat[targetIndex]);
  };

  const handleMoveDown = (fromIndex: number) => {
    const estimatedColumns = Math.max(1, Math.floor(containerWidth / 108));
    const targetIndex = fromIndex + estimatedColumns;
    if (targetIndex >= flat.length) return;
    const newFlat = moveItem(flat, fromIndex, targetIndex);
    applyKeyboardReorder(newFlat, flat[fromIndex].id, newFlat[targetIndex]);
  };

  const globalIndex = (shortcutId: string) => flat.findIndex((shortcut) => shortcut.id === shortcutId);

  useEffect(() => {
    sortableInstancesRef.current.forEach((instance) => instance.destroy());
    sortableInstancesRef.current = [];

    groups.forEach((group) => {
      const container = groupContainerRefs.current[group.name];
      if (!container) return;

      const instance = Sortable.create(container, {
        group: 'browsermain-shortcuts',
        draggable: '[data-shortcut-id]',
        handle: '[data-drag-handle="true"]',
        filter: 'button, input, textarea, [data-no-drag="true"]',
        preventOnFilter: false,
        animation: 180,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        swapThreshold: 0.72,
        invertSwap: true,
        emptyInsertThreshold: 16,
        ghostClass: styles.sortableGhost,
        chosenClass: styles.sortableChosen,
        dragClass: styles.sortableDrag,
        forceFallback: false,
        delayOnTouchOnly: true,
        onStart: (event: SortableEvent) => {
          const dragged = event.item as HTMLElement;
          setActiveDragId(dragged.dataset.shortcutId || null);
          setDragActive(true);
          clearGroupIntent();
        },
        onMove: (event: MoveEvent) => {
          const dragged = event.dragged as HTMLElement | undefined;
          const related = event.related as HTMLElement | undefined;
          const activeId = dragged?.dataset.shortcutId || null;
          const overId = related?.dataset.shortcutId || null;

          if (!activeId || !overId || activeId === overId) {
            clearGroupIntent();
            return true;
          }

          const activeShortcut = flat.find((shortcut) => shortcut.id === activeId);
          const overShortcut = flat.find((shortcut) => shortcut.id === overId);
          if (!activeShortcut || !overShortcut) {
            clearGroupIntent();
            return true;
          }

          const activeGroup = normalizeGroupName(activeShortcut.group);
          const overGroup = normalizeGroupName(overShortcut.group);
          const canGroup = activeGroup !== overGroup || (!activeGroup && !overGroup);
          if (!canGroup) {
            clearGroupIntent();
            return true;
          }

          dropTargetIdRef.current = overId;
          if (groupIntentCandidateRef.current === overId) return true;

          clearGroupIntent();
          groupIntentCandidateRef.current = overId;
          dropTargetIdRef.current = overId;
          groupIntentTimerRef.current = window.setTimeout(() => {
            setGroupPreviewTargetId(overId);
          }, 300);
          return true;
        },
        onEnd: (event: SortableEvent) => {
          const activeId = (event.item as HTMLElement).dataset.shortcutId || null;
          const overId = dropTargetIdRef.current;
          if (activeId && groupPreviewTargetId && overId === groupPreviewTargetId && activeId !== overId) {
            applyGroupMerge(activeId, overId);
            resetDragState();
            return;
          }

          const orderedIds = buildOrderFromDom();
          if (orderedIds.length === flat.length) {
            applyOrderedIds(orderedIds);
          }
          resetDragState();
        },
      });

      sortableInstancesRef.current.push(instance);
    });

    return () => {
      sortableInstancesRef.current.forEach((instance) => instance.destroy());
      sortableInstancesRef.current = [];
      clearGroupIntent();
    };
  }, [groups, flat, existingGroups, groupPreviewTargetId, t]);

  return (
    <div className={`${styles.panel} ${dragActive ? styles.dragActive : ''}`} ref={panelRef}>
      <div className={styles.cardTitle}>{t('shortcutsTitle')}</div>
      {shortcuts.length > 0 && (
        <div className={styles.headerRow}>
          <span />
          <span className={styles.count}>
            {t('shortcutsCount', {
              count: shortcuts.length,
              groupSuffix: groups.length > 1 ? t('groupSuffix', { count: groups.length }) : '',
            })}
          </span>
          <span className={styles.hint}>{t('rightClickToEdit')}</span>
        </div>
      )}
      {shortcuts.length === 0 ? (
        <div className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>{t('noShortcutsTitle')}</div>
            <div className={styles.emptyHint} style={{ marginTop: 8, opacity: 0.7 }}>
              {t('noShortcutsHint')}
            </div>
            <div className={styles.emptyActions}>
              {onAdd && (
                <button className={styles.emptyAddBtn} onClick={onAdd} tabIndex={0}>
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
        groups.map((group, groupIndex) => (
          <div key={group.name} className={styles.groupSection}>
            {groups.length > 1 && (
              <div className={styles.groupHeader}>
                <span className={styles.groupName}>{group.name}</span>
                <span className={styles.groupCount}>({group.shortcuts.length})</span>
              </div>
            )}
            <div
              className={styles.groupTiles}
              data-group-name={group.name}
              ref={(node) => {
                groupContainerRefs.current[group.name] = node;
              }}
            >
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
                  isGroupPreviewTarget={groupPreviewTargetId === shortcut.id && activeDragId !== shortcut.id}
                />
              ))}
              {onAdd && groupIndex === groups.length - 1 && (
                <button
                  className={styles.addTile}
                  onClick={onAdd}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onAdd?.();
                    }
                  }}
                  tabIndex={0}
                  aria-label={t('addShortcutAria')}
                  title={t('addShortcut')}
                >
                  <span className={styles.addTileIcon}>+</span>
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
