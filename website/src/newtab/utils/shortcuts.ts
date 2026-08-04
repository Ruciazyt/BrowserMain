// Pure helpers for the shortcut grid. No React, no DOM, no chrome.* — kept
// here so the reorder/group/merge logic is testable in isolation and so the
// `useShortcuts` hook and `ShortcutGrid` component share a single source of
// truth for "how a drag end turns into persisted state."

import type { Shortcut } from './storage';

export interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

export const DEFAULT_GROUP_NAME = 'Default';

/** The storage bucket for an ungrouped shortcut. */
export function groupStorageKey(shortcut: Shortcut): string {
  return normalizeGroupName(shortcut.group) ?? DEFAULT_GROUP_NAME;
}

/** Trim a group name; return undefined if it is empty. */
export function normalizeGroupName(name?: string | null): string | undefined {
  const trimmed = name?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Build a unique group name based on `baseName`, appending " 2", " 3", ... as
 * needed to avoid clashing with the existing group names.
 */
export function createUniqueGroupName(
  baseName: string,
  existingGroups: readonly string[],
): string {
  const normalizedBase = baseName.trim() || DEFAULT_GROUP_NAME;
  const used = new Set(existingGroups.map((group) => group.trim().toLowerCase()));
  if (!used.has(normalizedBase.toLowerCase())) return normalizedBase;
  let index = 2;
  while (used.has(`${normalizedBase} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${normalizedBase} ${index}`;
}

/** Generic array move. Out-of-range indices return a shallow copy unchanged. */
export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return [...items];
  if (fromIndex < 0 || fromIndex >= items.length) return [...items];
  if (toIndex < 0 || toIndex >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Bucket shortcuts into groups, sort each bucket by `order`, then order the
 * groups themselves by their minimum `order` (alpha as tie-breaker). This
 * matches the visual order the grid rendered with.
 */
export function buildShortcutGroups(shortcuts: readonly Shortcut[]): ShortcutGroup[] {
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
    const minOf = (key: string) =>
      Math.min(...(map.get(key) ?? []).map((item) => item.order));
    return minOf(a) - minOf(b) || a.localeCompare(b);
  });
  return keys.map((name) => ({ name, shortcuts: map.get(name)! }));
}

export function flattenShortcutGroups(groups: readonly ShortcutGroup[]): Shortcut[] {
  return groups.flatMap((group) => group.shortcuts);
}

/** Generate a new shortcut id. Uses crypto.randomUUID when available, else a
 *  timestamp + random suffix that matches the legacy format. */
export function createShortcutId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * The payload passed to `applyDragEnd`. Encapsulates everything the reducer
 * needs to turn a drag end into a new shortcut list. The `destGroup` field
 * lets callers (e.g. a keyboard handler) drive a move into a group without a
 * real `over` target — pass `overId: null` in that case.
 */
export interface DragEndPayload {
  activeId: string;
  overId: string | null;
  /** The group the active tile was in before the drag started. */
  sourceGroup: string;
  /** The group the active tile should end up in. */
  destGroup: string;
  /**
   * Optional. When the user drops a tile ONTO another tile, this says the
   * active tile is being merged into the over-tile's group. If the over-tile
   * was ungrouped, a new group is created from its title. If `merge` is
   * false, the active tile simply takes the destination container's group.
   */
  merge?: boolean;
}

/**
 * Pure reducer: take the current shortcut list and a drag-end payload, return
 * the new list (or `null` if the move is a no-op). The returned list has
 * stable, sequential `order` values starting from 0, and every moved tile's
 * `group` is set to the destination group. Other tiles retain their data
 * (including their `favicon` and any unsynced fields) but get their `order`
 * refreshed to match the new flat layout.
 */
export function applyDragEnd(
  state: readonly Shortcut[],
  payload: DragEndPayload,
  options?: { defaultGroupName?: string },
): Shortcut[] | null {
  const defaultGroup = options?.defaultGroupName ?? DEFAULT_GROUP_NAME;
  const activeIndex = state.findIndex((s) => s.id === payload.activeId);
  if (activeIndex === -1) return null;
  const activeShortcut = state[activeIndex];

  const sourceGroup = normalizeGroupName(payload.sourceGroup) ?? defaultGroup;

  // Determine the destination group, and which tiles (if any) get the
  // "merge" treatment where the over-tile also joins the new group.
  let targetGroup = normalizeGroupName(payload.destGroup) ?? defaultGroup;
  let mergeWithOver = false;
  if (payload.merge && payload.overId && payload.overId !== payload.activeId) {
    const overShortcut = state.find((s) => s.id === payload.overId);
    if (overShortcut) {
      const overGroup = normalizeGroupName(overShortcut.group);
      if (overGroup && overGroup !== sourceGroup) {
        // Cross-group drop onto a grouped tile: just move into its group.
        targetGroup = overGroup;
      } else if (!overGroup && sourceGroup === defaultGroup) {
        // Drop on an ungrouped tile from the ungrouped group: create a new
        // group named after the over-tile. The over-tile joins the new
        // group too — this is the "drop to group" UX.
        const existingGroupNames = Array.from(
          new Set(state.map((s) => normalizeGroupName(s.group)).filter(Boolean) as string[]),
        );
        targetGroup = createUniqueGroupName(
          overShortcut.title?.trim() || defaultGroup,
          existingGroupNames,
        );
        mergeWithOver = true;
      }
      // Else: same group or destination explicitly set — no merge.
    }
  }

  const normalizedTarget = targetGroup;

  // No-op: nothing actually moves (e.g. drag ended in place with no over
  // target and the tile is already at the end of its group).
  const overIndex = payload.overId
    ? state.findIndex((s) => s.id === payload.overId)
    : -1;
  if (
    overIndex === -1 &&
    sourceGroup === normalizedTarget &&
    activeIndex === state.length - 1
  ) {
    return null;
  }

  // Split into per-group buckets, mutate the destination bucket, then
  // reassemble. This keeps the cross-group move O(n) without DOM reads.
  const buckets = new Map<string, Shortcut[]>();
  for (const shortcut of state) {
    const key = groupStorageKey(shortcut);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(shortcut);
  }

  // Remove active from its source bucket.
  const sourceBucket = buckets.get(sourceGroup) ?? [];
  const withoutActive = sourceBucket.filter((s) => s.id !== payload.activeId);

  // The destination bucket is the source bucket when source === dest, or
  // (after removing the active tile) the original destination bucket
  // otherwise. Critically, we never re-insert into a bucket that still
  // contains the active tile (same-group bug fix).
  const destBucket =
    sourceGroup === normalizedTarget
      ? withoutActive
      : (buckets.get(normalizedTarget) ?? []).slice();

  // Where in the destination does the active tile land?
  let insertAt: number;
  if (overIndex === -1) {
    insertAt = destBucket.length;
  } else {
    const overInDest = destBucket.findIndex((s) => s.id === payload.overId);
    insertAt = overInDest === -1 ? destBucket.length : overInDest;
  }

  const targetGroupField =
    normalizedTarget === defaultGroup ? undefined : normalizedTarget;
  const nextActive: Shortcut = { ...activeShortcut, group: targetGroupField };
  destBucket.splice(insertAt, 0, nextActive);

  // If merging, the over-tile also gets the new group. Update it in place in
  // the destination bucket (or move it there if it lived in the source).
  let sourceFinal: Shortcut[] = withoutActive;
  if (mergeWithOver && payload.overId) {
    const overIdx = destBucket.findIndex((s) => s.id === payload.overId);
    if (overIdx >= 0) {
      destBucket[overIdx] = { ...destBucket[overIdx], group: targetGroupField };
    } else {
      // Over was in the source bucket — splice it out of source and into dest.
      const overShortcut = state.find((s) => s.id === payload.overId);
      if (overShortcut) {
        sourceFinal = withoutActive.filter((s) => s.id !== payload.overId);
        if (sourceGroup === normalizedTarget) {
          // Already accounted for in the destBucket derivation above; just
          // update its group inline.
          const i = destBucket.findIndex((s) => s.id === payload.overId);
          if (i >= 0) destBucket[i] = { ...destBucket[i], group: targetGroupField };
        } else {
          destBucket.splice(insertAt, 0, { ...overShortcut, group: targetGroupField });
        }
      }
    }
  }

  // Rewrite the buckets map.
  if (sourceGroup !== normalizedTarget) {
    if (sourceFinal.length === 0) buckets.delete(sourceGroup);
    else buckets.set(sourceGroup, sourceFinal);
  }
  buckets.set(normalizedTarget, destBucket);

  // Flatten in a stable order: groups follow the same visual order as the
  // input, except newly-created groups go to the end.
  const inputGroups = buildShortcutGroups(state).map((g) => g.name);
  const groupOrder: string[] = [];
  const seen = new Set<string>();
  for (const name of inputGroups) {
    if (buckets.has(name) && (buckets.get(name)!.length > 0) && !seen.has(name)) {
      groupOrder.push(name);
      seen.add(name);
    }
  }
  for (const name of buckets.keys()) {
    if (!seen.has(name) && (buckets.get(name)!.length > 0)) {
      groupOrder.push(name);
      seen.add(name);
    }
  }

  const result: Shortcut[] = [];
  let order = 0;
  for (const name of groupOrder) {
    for (const shortcut of buckets.get(name)!) {
      result.push({ ...shortcut, order });
      order += 1;
    }
  }

  // No-op detection: same id sequence, same group for each, in the same
  // order. If anything changed (group reassignment, position swap) the
  // result will differ and we return it.
  if (
    result.length === state.length &&
    result.every((s, i) => s.id === state[i].id && s.group === state[i].group)
  ) {
    return null;
  }
  return result;
}

/**
 * Recompute the `order` field for a shortcut list, preserving group/order
 * as-is. Useful after a bulk group rename when nothing else changed.
 */
export function recomputeOrder(shortcuts: readonly Shortcut[]): Shortcut[] {
  const groups = buildShortcutGroups(shortcuts);
  return flattenShortcutGroups(groups).map((shortcut, index) => ({ ...shortcut, order: index }));
}

/**
 * Move one shortcut in a flat list to a new flat index, keeping its group
 * (unless the new position is in a different group). Returns the new list
 * with `order` rewritten sequentially.
 */
export function moveShortcutInFlat(
  shortcuts: readonly Shortcut[],
  fromIndex: number,
  toIndex: number,
): Shortcut[] {
  if (fromIndex === toIndex) return [...shortcuts];
  const moved = shortcuts[fromIndex];
  if (!moved) return [...shortcuts];
  return moveItem([...shortcuts], fromIndex, toIndex).map((shortcut, index) => ({
    ...shortcut,
    order: index,
  }));
}

/**
 * Reorder the groups themselves (not the tiles within a group). The new
 * group order is a permutation of the existing group names; any groups not
 * present in `newGroupOrder` are appended in their original order (defensive
 * against the caller passing a partial list). Returns `null` if the order
 * is unchanged.
 */
export function reorderGroups(
  state: readonly Shortcut[],
  newGroupOrder: readonly string[],
): Shortcut[] | null {
  const groups = buildShortcutGroups(state);
  const byName = new Map(groups.map((g) => [g.name, g]));

  const result: ShortcutGroup[] = [];
  const seen = new Set<string>();
  for (const name of newGroupOrder) {
    const g = byName.get(name);
    if (g && !seen.has(name)) {
      result.push(g);
      seen.add(name);
    }
  }
  for (const g of groups) {
    if (!seen.has(g.name)) result.push(g);
  }

  // No-op detection
  if (result.every((g, i) => groups[i]?.name === g.name)) return null;

  const flattened: Shortcut[] = [];
  let order = 0;
  for (const g of result) {
    for (const s of g.shortcuts) {
      flattened.push({ ...s, order });
      order += 1;
    }
  }
  return flattened;
}
