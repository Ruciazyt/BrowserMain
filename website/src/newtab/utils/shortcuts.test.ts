import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GROUP_NAME,
  applyDragEnd,
  buildShortcutGroups,
  createShortcutId,
  createUniqueGroupName,
  flattenShortcutGroups,
  groupStorageKey,
  moveItem,
  moveShortcutInFlat,
  normalizeGroupName,
  recomputeOrder,
  reorderGroups,
} from './shortcuts';
import type { Shortcut } from './storage';
import { makeShortcuts } from '../../test/mocks';

describe('groupStorageKey', () => {
  it('returns the trimmed group name when set', () => {
    expect(groupStorageKey({ id: 'a', title: 'A', url: 'https://a', order: 0, group: '  Work  ' })).toBe('Work');
  });

  it('returns "Default" for ungrouped shortcuts', () => {
    expect(groupStorageKey({ id: 'a', title: 'A', url: 'https://a', order: 0 })).toBe(DEFAULT_GROUP_NAME);
    expect(groupStorageKey({ id: 'a', title: 'A', url: 'https://a', order: 0, group: '' })).toBe(DEFAULT_GROUP_NAME);
    expect(groupStorageKey({ id: 'a', title: 'A', url: 'https://a', order: 0, group: '   ' })).toBe(DEFAULT_GROUP_NAME);
  });
});

describe('normalizeGroupName', () => {
  it('returns undefined for empty or whitespace strings', () => {
    expect(normalizeGroupName(undefined)).toBeUndefined();
    expect(normalizeGroupName(null)).toBeUndefined();
    expect(normalizeGroupName('')).toBeUndefined();
    expect(normalizeGroupName('   ')).toBeUndefined();
  });

  it('trims and returns the value otherwise', () => {
    expect(normalizeGroupName('  Work  ')).toBe('Work');
  });
});

describe('createUniqueGroupName', () => {
  it('returns the base when it does not collide', () => {
    expect(createUniqueGroupName('Work', [])).toBe('Work');
  });

  it('appends " 2", " 3" for collisions, case-insensitively', () => {
    expect(createUniqueGroupName('Work', ['Work', 'work', 'WORK'])).toBe('Work 2');
    expect(createUniqueGroupName('Work', ['Work', 'Work 2'])).toBe('Work 3');
  });

  it('falls back to "Default" when base is empty', () => {
    expect(createUniqueGroupName('   ', ['Default'])).toBe('Default 2');
  });
});

describe('buildShortcutGroups', () => {
  it('buckets shortcuts by group and orders by order field', () => {
    const shortcuts: Shortcut[] = makeShortcuts([
      { id: 'a1', group: 'Work', order: 1 },
      { id: 'a2', group: 'Work', order: 0 },
      { id: 'b1', group: 'Dev', order: 0 },
    ]);
    const groups = buildShortcutGroups(shortcuts);
    expect(groups.map((g) => g.name)).toEqual(['Dev', 'Work']);
    expect(groups[1].shortcuts.map((s) => s.id)).toEqual(['a2', 'a1']);
  });

  it('puts ungrouped shortcuts under "Default"', () => {
    const shortcuts: Shortcut[] = makeShortcuts([
      { id: 'a1', order: 0 },
      { id: 'a2', group: 'Work', order: 1 },
    ]);
    const groups = buildShortcutGroups(shortcuts);
    expect(groups[0].name).toBe(DEFAULT_GROUP_NAME);
    expect(groups[1].name).toBe('Work');
  });
});

describe('flattenShortcutGroups', () => {
  it('round-trips through buildShortcutGroups', () => {
    const shortcuts: Shortcut[] = makeShortcuts([
      { id: 'a1', order: 0, group: 'X' },
      { id: 'a2', order: 1, group: 'X' },
      { id: 'b1', order: 0, group: 'Y' },
    ]);
    const flat = flattenShortcutGroups(buildShortcutGroups(shortcuts));
    expect(flat.map((s) => s.id)).toEqual(['a1', 'a2', 'b1']);
  });
});

describe('moveItem', () => {
  it('moves an element within bounds', () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });

  it('returns a copy when from === to', () => {
    const arr = [1, 2, 3];
    const moved = moveItem(arr, 1, 1);
    expect(moved).toEqual([1, 2, 3]);
    expect(moved).not.toBe(arr);
  });

  it('returns a copy unchanged for out-of-range indices', () => {
    const arr = [1, 2, 3];
    expect(moveItem(arr, -1, 2)).toEqual([1, 2, 3]);
    expect(moveItem(arr, 1, 99)).toEqual([1, 2, 3]);
  });
});

describe('createShortcutId', () => {
  it('returns a non-empty string', () => {
    const id = createShortcutId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique values on repeated calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createShortcutId()));
    expect(ids.size).toBe(50);
  });
});

describe('applyDragEnd — within-group reorder', () => {
  it('reorders items within the same group and rewrites order', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0, group: 'X' },
      { id: 'b', order: 1, group: 'X' },
      { id: 'c', order: 2, group: 'X' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: 'c',
      sourceGroup: 'X',
      destGroup: 'X',
      merge: false,
    });
    expect(next).not.toBeNull();
    // The active tile is inserted at the position of the over tile. With
    // "X" as the source/dest and the active `a` moving past `c`, the
    // resulting order should be b, a, c (b is shifted up to fill a's spot,
    // a lands at c's old position, c moves after a).
    expect(next!.map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(next!.map((s) => s.order)).toEqual([0, 1, 2]);
    expect(next!.every((s) => s.group === 'X')).toBe(true);
  });
});

describe('applyDragEnd — cross-group move', () => {
  it('moves a tile into another group and assigns the new group', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1, group: 'Work' },
      { id: 'c', order: 2, group: 'Work' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: 'b',
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: 'Work',
      merge: true,
    });
    expect(next).not.toBeNull();
    // a moves into Work, ending up at b's position; b is pushed down.
    const workGroup = next!.filter((s) => s.group === 'Work');
    expect(workGroup.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(workGroup.every((s) => s.order === workGroup.indexOf(s))).toBe(true);
    expect(next!.find((s) => s.id === 'a')!.group).toBe('Work');
  });

  it('does not duplicate a shortcut when crossing groups', () => {
    // Regression test for the "duplicate shortcut on cross-group move" bug.
    // The input has 3 shortcuts in 2 groups; the move takes one out of its
    // group and places it in the other. The result must still have exactly
    // 3 shortcuts — no copies, no losses.
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2, group: 'X' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: 'c',
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: 'X',
      merge: true,
    });
    expect(next).not.toBeNull();
    expect(next!.length).toBe(3);
    expect(new Set(next!.map((s) => s.id))).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('applyDragEnd — drop on ungrouped creates new group', () => {
  it('creates a new group from the over-tile title when both are ungrouped', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1, title: 'My Site' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: 'b',
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: DEFAULT_GROUP_NAME,
      merge: true,
    });
    // eslint-disable-next-line no-console
    expect(next).not.toBeNull();
    const a = next!.find((s) => s.id === 'a')!;
    const b = next!.find((s) => s.id === 'b')!;
    expect(a.group).toBe('My Site');
    expect(b.group).toBe('My Site');
  });

  it('avoids colliding with an existing group name when creating', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1, title: 'My Site' },
      { id: 'c', order: 2, group: 'My Site' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: 'b',
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: DEFAULT_GROUP_NAME,
      merge: true,
    });
    expect(next).not.toBeNull();
    const a = next!.find((s) => s.id === 'a')!;
    expect(a.group).toBe('My Site 2');
  });
});

describe('applyDragEnd — edge cases', () => {
  it('returns null for an unknown active id', () => {
    const state: Shortcut[] = makeShortcuts([{ id: 'a', order: 0 }]);
    expect(
      applyDragEnd(state, {
        activeId: 'missing',
        overId: 'a',
        sourceGroup: DEFAULT_GROUP_NAME,
        destGroup: DEFAULT_GROUP_NAME,
      }),
    ).toBeNull();
  });

  it('clears the group field when moving into the Default group', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0, group: 'Work' },
      { id: 'b', order: 1 },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: 'b',
      sourceGroup: 'Work',
      destGroup: DEFAULT_GROUP_NAME,
      merge: true,
    });
    expect(next).not.toBeNull();
    const a = next!.find((s) => s.id === 'a')!;
    expect(a.group).toBeUndefined();
  });
});

describe('recomputeOrder', () => {
  it('rewrites order to match the current visual order', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 5, group: 'X' },
      { id: 'b', order: 0, group: 'X' },
    ]);
    const next = recomputeOrder(state);
    expect(next.map((s) => s.id)).toEqual(['b', 'a']);
    expect(next.map((s) => s.order)).toEqual([0, 1]);
  });
});

describe('moveShortcutInFlat', () => {
  it('rewrites order on a simple in-flat move', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2 },
    ]);
    const next = moveShortcutInFlat(state, 0, 2);
    expect(next.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(next.map((s) => s.order)).toEqual([0, 1, 2]);
  });
});

describe('reorderGroups', () => {
  it('moves a group from one position to another and rewrites order', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0, group: 'A' },
      { id: 'b', order: 1, group: 'A' },
      { id: 'c', order: 0, group: 'B' },
      { id: 'd', order: 0, group: 'C' },
    ]);
    // Current group order (by min order then alpha): A (min 0), B (min 0 → 'B' > 'A'? actually A first), C (min 0)
    // buildShortcutGroups sorts by min order then alpha: A, B, C (all min 0, alpha A < B < C).
    const next = reorderGroups(state, ['C', 'A', 'B']);
    expect(next).not.toBeNull();
    const groups = buildShortcutGroups(next!);
    expect(groups.map((g) => g.name)).toEqual(['C', 'A', 'B']);
    expect(groups[0].shortcuts.map((s) => s.id)).toEqual(['d']);
    expect(groups[1].shortcuts.map((s) => s.id)).toEqual(['a', 'b']);
    expect(groups[2].shortcuts.map((s) => s.id)).toEqual(['c']);
    // order rewritten sequentially
    expect(next!.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it('returns null when the new order matches the current order', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0, group: 'X' },
      { id: 'b', order: 0, group: 'Y' },
    ]);
    expect(reorderGroups(state, ['X', 'Y'])).toBeNull();
  });

  it('appends groups that are missing from newGroupOrder (defensive)', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0, group: 'A' },
      { id: 'b', order: 0, group: 'B' },
      { id: 'c', order: 0, group: 'C' },
    ]);
    const next = reorderGroups(state, ['C']);
    expect(next).not.toBeNull();
    const groups = buildShortcutGroups(next!);
    expect(groups.map((g) => g.name)).toEqual(['C', 'A', 'B']);
  });

  it('preserves tile order within each group after a group reorder', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a1', order: 0, group: 'A' },
      { id: 'a2', order: 1, group: 'A' },
      { id: 'a3', order: 2, group: 'A' },
      { id: 'b1', order: 0, group: 'B' },
      { id: 'b2', order: 1, group: 'B' },
    ]);
    const next = reorderGroups(state, ['B', 'A']);
    expect(next).not.toBeNull();
    const groups = buildShortcutGroups(next!);
    expect(groups[0].shortcuts.map((s) => s.id)).toEqual(['b1', 'b2']);
    expect(groups[1].shortcuts.map((s) => s.id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('handles reorder with the Default group', () => {
    const state: Shortcut[] = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 0, group: 'Work' },
    ]);
    const next = reorderGroups(state, ['Work', DEFAULT_GROUP_NAME]);
    expect(next).not.toBeNull();
    const groups = buildShortcutGroups(next!);
    expect(groups.map((g) => g.name)).toEqual(['Work', DEFAULT_GROUP_NAME]);
  });
});

describe('applyDragEnd — full drop matrix', () => {
  // These tests cover every combination of source/destination groups the
  // component's onDragEnd handler can produce. Together they pin down the
  // contract for "cross-group drag both directions" — the bug the user
  // reported before the refactor.

  it('within-group reorder: A→B position swap', () => {
    const state = makeShortcuts([
      { id: 'a', order: 0, group: 'X' },
      { id: 'b', order: 1, group: 'X' },
      { id: 'c', order: 2, group: 'X' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a', overId: 'c', sourceGroup: 'X', destGroup: 'X', merge: false,
    });
    expect(next).not.toBeNull();
    // Active lands at the over's position; intermediate items shift.
    expect(next!.filter((s) => s.group === 'X').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('cross-group move FORWARD (group 1 → group 2)', () => {
    // Regression: the user reported drag only worked in one direction.
    const state = makeShortcuts([
      { id: 'a', order: 0 },                         // Default
      { id: 'b', order: 0, group: 'Work' },
      { id: 'c', order: 1, group: 'Work' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a', overId: 'b', sourceGroup: DEFAULT_GROUP_NAME, destGroup: 'Work', merge: true,
    });
    expect(next).not.toBeNull();
    const a = next!.find((s) => s.id === 'a')!;
    expect(a.group).toBe('Work');
    expect(next!.filter((s) => s.group === 'Work').length).toBe(3);
  });

  it('cross-group move BACKWARD (group 2 → group 1)', () => {
    // Regression: the other direction of the same user-reported bug.
    const state = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 0, group: 'Work' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'c', overId: 'a', sourceGroup: 'Work', destGroup: DEFAULT_GROUP_NAME, merge: true,
    });
    expect(next).not.toBeNull();
    const c = next!.find((s) => s.id === 'c')!;
    expect(c.group).toBeUndefined();
    expect(next!.filter((s) => s.group === 'Work').length).toBe(0);
  });

  it('drop onto an empty group container (overId: null)', () => {
    // The component emits this payload when the user drops a tile onto a
    // group container's empty area (the useDroppable on the group card).
    const state = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 0, group: 'Empty' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a',
      overId: null,
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: 'Empty',
      merge: false,
    });
    expect(next).not.toBeNull();
    const a = next!.find((s) => s.id === 'a')!;
    expect(a.group).toBe('Empty');
    expect(next!.filter((s) => s.group === 'Empty').length).toBe(2);
  });

  it('does not create a new group when dragging from Default onto a grouped tile', () => {
    // The "drop to group" UX only fires when both source and over are
    // ungrouped. Dragging a Default tile onto a grouped tile just moves
    // the tile into that group — no new group is created.
    const state = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 0, group: 'Existing' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a', overId: 'b',
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: 'Existing',
      merge: true,
    });
    expect(next).not.toBeNull();
    // a moves into Existing, b stays in Existing, no new group.
    expect(next!.filter((s) => s.group === 'Existing').length).toBe(2);
    const groupNames = Array.from(new Set(next!.map((s) => s.group).filter(Boolean)));
    expect(groupNames).toEqual(['Existing']);
  });

  it('does not create a new group when dragging from a group onto a Default tile', () => {
    // Asymmetric to the above: dragging Work → Default should clear the
    // group, not create a new one.
    const state = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 0, group: 'Work' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'b', overId: 'a',
      sourceGroup: 'Work',
      destGroup: DEFAULT_GROUP_NAME,
      merge: true,
    });
    expect(next).not.toBeNull();
    const b = next!.find((s) => s.id === 'b')!;
    expect(b.group).toBeUndefined();
  });

  it('produces no duplicate after a cross-group move', () => {
    // The "duplicate shortcut" bug regression. Run several cross-group
    // moves in sequence and confirm the count never grows.
    let state = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 0, group: 'X' },
      { id: 'd', order: 1, group: 'X' },
    ]);
    const moves = [
      { activeId: 'a', overId: 'c', sourceGroup: DEFAULT_GROUP_NAME, destGroup: 'X', merge: true },
      { activeId: 'b', overId: 'a', sourceGroup: DEFAULT_GROUP_NAME, destGroup: 'X', merge: true },
      { activeId: 'c', overId: 'a', sourceGroup: 'X', destGroup: DEFAULT_GROUP_NAME, merge: true },
      { activeId: 'd', overId: 'b', sourceGroup: 'X', destGroup: DEFAULT_GROUP_NAME, merge: true },
    ];
    for (const payload of moves) {
      const next = applyDragEnd(state, payload);
      if (next) state = next;
      expect(new Set(state.map((s) => s.id)).size).toBe(4);
      expect(state.length).toBe(4);
    }
  });

  it('preserves other fields (favicon, title) when moving across groups', () => {
    const state = makeShortcuts([
      { id: 'a', order: 0, title: 'A', favicon: 'https://a.com/icon.png' },
      { id: 'b', order: 0, group: 'Work', title: 'B' },
    ]);
    const next = applyDragEnd(state, {
      activeId: 'a', overId: 'b',
      sourceGroup: DEFAULT_GROUP_NAME,
      destGroup: 'Work',
      merge: true,
    });
    expect(next).not.toBeNull();
    const a = next!.find((s) => s.id === 'a')!;
    expect(a.favicon).toBe('https://a.com/icon.png');
    expect(a.title).toBe('A');
    expect(a.group).toBe('Work');
  });
});
