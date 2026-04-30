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
  isGlobalEditing,
  onEnterEditMode,
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
  isGlobalEditing?: boolean;
  onEnterEditMode?: () => void;
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
        isGlobalEditing={isGlobalEditing}
        onEnterEditMode={onEnterEditMode}
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
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [renamingGroupName, setRenamingGroupName] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Refs for values consumed by SortableJS callbacks — kept in sync so the
  // Sortable-create effect doesn't need to re-run on every data change.
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const groupPreviewTargetIdRef = useRef(groupPreviewTargetId);
  groupPreviewTargetIdRef.current = groupPreviewTargetId;

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

  const startRenameGroup = (groupName: string) => {
    setRenamingGroupName(groupName);
    setRenameInputValue(groupName === 'Default' ? '' : groupName);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitGroupRename = (oldName: string, newName: string) => {
    setRenamingGroupName(null);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const target = trimmed === 'Default' ? undefined : trimmed;
    for (const s of shortcuts) {
      const g = s.group?.trim() || 'Default';
      if (g === oldName) {
        onUpdate(s.id, { group: target });
      }
    }
  };

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
    return groupsRef.current.flatMap((group) => {
      const container = groupContainerRefs.current[group.name];
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>('[data-shortcut-id]'))
        .map((node) => node.dataset.shortcutId || '')
        .filter(Boolean);
    });
  };

  const applyOrderedIds = (orderedIds: string[]) => {
    if (orderedIds.length !== flatRef.current.length) return;
    const shortcutMap = new Map(flatRef.current.map((shortcut) => [shortcut.id, shortcut]));
    const merged = orderedIds.reduce<Shortcut[]>((acc, id, index) => {
      const shortcut = shortcutMap.get(id);
      if (!shortcut) return acc;
      const container = groupsRef.current
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

    if (merged.length === flatRef.current.length) {
      onReorder(merged);
    }
  };

  const applyGroupMerge = (activeId: string, overId: string) => {
    const activeShortcut = flatRef.current.find((shortcut) => shortcut.id === activeId);
    const overShortcut = flatRef.current.find((shortcut) => shortcut.id === overId);
    if (!activeShortcut || !overShortcut) return;

    const targetGroup = normalizeGroupName(overShortcut.group)
      || createUniqueGroupName(overShortcut.title.trim() || t('defaultGroupName'), existingGroups);

    const orderedIds = buildOrderFromDom();
    if (orderedIds.length !== flatRef.current.length) return;

    const shortcutMap = new Map(flatRef.current.map((shortcut) => [shortcut.id, shortcut]));
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
    if (!isGlobalEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGlobalEditing(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isGlobalEditing]);

  useEffect(() => {
    sortableInstancesRef.current.forEach((instance) => instance.destroy());
    sortableInstancesRef.current = [];

    groupsRef.current.forEach((group) => {
      const container = groupContainerRefs.current[group.name];
      if (!container) return;

      const instance = Sortable.create(container, {
        group: 'browsermain-shortcuts',
        draggable: '[data-shortcut-id]',
        handle: '[data-drag-handle="true"]',
        filter: 'input, textarea',
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
        disabled: !isGlobalEditing,
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

          const activeShortcut = flatRef.current.find((shortcut) => shortcut.id === activeId);
          const overShortcut = flatRef.current.find((shortcut) => shortcut.id === overId);
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
          // Immediately clean up ghost/chosen/drag classes from all containers
          document.querySelectorAll(`.${styles.sortableGhost}, .${styles.sortableChosen}, .${styles.sortableDrag}`).forEach((el) => {
            el.classList.remove(styles.sortableGhost, styles.sortableChosen, styles.sortableDrag);
          });

          // Browsers synthesize a click event after native drag-and-drop.
          // SortableJS cannot reliably suppress it in fallback-less mode,
          // and React reconciliation after onReorder can race with that click.
          // Block the next click on ANY shortcut tile (except action buttons)
          // at the document level — the drop may have shifted tiles under the
          // cursor, so the click target is not necessarily the dragged item.
          const blockClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const tile = target.closest('[data-shortcut-id]');
            if (tile && !target.closest('button, a, input, textarea')) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
            }
            document.removeEventListener('click', blockClick, true);
          };
          document.addEventListener('click', blockClick, true);
          window.setTimeout(() => document.removeEventListener('click', blockClick, true), 300);

          const activeId = (event.item as HTMLElement).dataset.shortcutId || null;
          const overId = dropTargetIdRef.current;
          if (activeId && groupPreviewTargetIdRef.current && overId === groupPreviewTargetIdRef.current && activeId !== overId) {
            applyGroupMerge(activeId, overId);
            resetDragState();
            return;
          }

          const orderedIds = buildOrderFromDom();
          if (orderedIds.length === flatRef.current.length) {
            applyOrderedIds(orderedIds);
          }
          resetDragState();
        },
      });

      sortableInstancesRef.current.push(instance);
    });

    return () => {
      // Clean up ghost/chosen/drag classes before destroying instances
      sortableInstancesRef.current.forEach((instance) => {
        instance.el.querySelectorAll(`.${styles.sortableGhost}, .${styles.sortableChosen}, .${styles.sortableDrag}`).forEach((el) => {
          el.classList.remove(styles.sortableGhost, styles.sortableChosen, styles.sortableDrag);
        });
        instance.destroy();
      });
      sortableInstancesRef.current = [];
      clearGroupIntent();
    };
  }, [existingGroups, t]);

  // Toggle sortable enabled/disabled when edit mode changes — no destroy/recreate
  useEffect(() => {
    sortableInstancesRef.current.forEach((instance) => {
      instance.option('disabled', !isGlobalEditing);
    });
  }, [isGlobalEditing]);

  return (
    <div className={`${styles.panel} ${dragActive ? styles.dragActive : ''}`} ref={panelRef}>
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
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            )}
            {isGlobalEditing ? t('done') : t('edit')}
          </button>
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
              <div className={styles.groupHeader} onClick={() => renamingGroupName !== group.name && startRenameGroup(group.name)}>
                {renamingGroupName === group.name ? (
                  <input
                    ref={renameInputRef}
                    className={styles.groupRenameInput}
                    value={renameInputValue}
                    onChange={(e) => setRenameInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { commitGroupRename(group.name, renameInputValue); }
                      if (e.key === 'Escape') { setRenamingGroupName(null); }
                    }}
                    onBlur={() => commitGroupRename(group.name, renameInputValue)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t('groupRenamePlaceholder')}
                    maxLength={30}
                  />
                ) : (
                  <>
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupCount}>({group.shortcuts.length})</span>
                  </>
                )}
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
                  isGlobalEditing={isGlobalEditing}
                  onEnterEditMode={() => setIsGlobalEditing(true)}
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
                  <span className={styles.addTileLabel}>{t('addWebsite')}</span>
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
