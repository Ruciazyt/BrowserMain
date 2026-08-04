import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useShortcuts, importShortcutsFromJson } from './useShortcuts';
import { mockChromeStorage, makeShortcut, makeShortcuts } from '../../test/mocks';

describe('useShortcuts — addShortcut', () => {
  beforeEach(() => {
    mockChromeStorage();
  });

  it('appends a new shortcut with the next order', async () => {
    const seed = makeShortcuts([{ id: 'a', url: 'https://a.com', order: 0 }]);
    const { getStored } = mockChromeStorage({ shortcuts: seed });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addShortcut('Example', 'https://example.com');
    });
    const stored = getStored();
    expect(stored).toHaveLength(2);
    expect(stored[1].url).toBe('https://example.com');
    expect(stored[1].title).toBe('Example');
    expect(stored[1].order).toBe(1);
  });

  it('dedupes by url (case-insensitive) — no duplicate is created', async () => {
    const seed = makeShortcuts([{ id: 'a', url: 'https://Example.com', order: 0 }]);
    const { getStored } = mockChromeStorage({ shortcuts: seed });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addShortcut('Example Duplicate', 'https://example.com');
    });
    // Storage is unchanged because the dedupe caught the duplicate.
    expect(getStored()).toHaveLength(1);
  });

  it('does not add when url is empty', async () => {
    const { getStored } = mockChromeStorage();
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addShortcut('Title', '   ');
    });
    expect(getStored()).toHaveLength(0);
  });
});

describe('useShortcuts — removeShortcut', () => {
  beforeEach(() => mockChromeStorage());

  it('removes the shortcut with the given id', async () => {
    const seed = makeShortcuts([
      { id: 'a', url: 'https://a.com', order: 0 },
      { id: 'b', url: 'https://b.com', order: 1 },
    ]);
    const { getStored } = mockChromeStorage({ shortcuts: seed });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeShortcut('a');
    });
    const stored = getStored();
    expect(stored.map((s) => s.id)).toEqual(['b']);
  });
});

describe('useShortcuts — updateShortcut', () => {
  beforeEach(() => mockChromeStorage());

  it('merges the patch into the matching shortcut', async () => {
    const seed = makeShortcuts([{ id: 'a', url: 'https://a.com', title: 'A', order: 0 }]);
    const { getStored } = mockChromeStorage({ shortcuts: seed });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateShortcut('a', { title: 'A renamed', group: 'Work' });
    });
    const a = getStored().find((s) => s.id === 'a')!;
    expect(a.title).toBe('A renamed');
    expect(a.group).toBe('Work');
    expect(a.url).toBe('https://a.com');
  });
});

describe('useShortcuts — reorderShortcuts (race-safe)', () => {
  beforeEach(() => mockChromeStorage());

  it('merges a reorder with concurrent updateShortcut writes — the duplicate-on-cross-group fix', async () => {
    // Simulate the bug scenario: a drag finishes and the caller hands the
    // reorder a list that was computed BEFORE a favicon auto-fetch landed.
    // The old reorderShortcuts would clobber the favicon. The new
    // implementation re-reads storage and merges by id, preserving the
    // out-of-band update.
    const initial = makeShortcuts([
      { id: 'a', url: 'https://a.com', order: 0, group: 'X' },
      { id: 'b', url: 'https://b.com', order: 1 },
      { id: 'c', url: 'https://c.com', order: 2, group: 'X' },
    ]);
    const { getStored } = mockChromeStorage({ shortcuts: initial });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 1) Out-of-band update: a tile gets a new favicon after the drag
    //    started but before the reorder persists.
    await act(async () => {
      await result.current.updateShortcut('b', { favicon: 'https://b.com/icon.png' });
    });

    // 2) Drag ends with a reordered list. Crucially, the reordered list
    //    was captured BEFORE the favicon update and doesn't carry the
    //    favicon. The race-safe reorder must preserve it.
    const reordered = [
      { ...initial[0], order: 0, group: 'X' },
      { ...initial[2], order: 1, group: 'X' },
      { ...initial[1], order: 2, group: undefined },
    ];
    await act(async () => {
      await result.current.reorderShortcuts(reordered);
    });

    const stored = getStored();
    // No duplicates: each id appears exactly once.
    expect(new Set(stored.map((s) => s.id))).toEqual(new Set(['a', 'b', 'c']));
    expect(stored).toHaveLength(3);
    // The favicon update from step 1 was preserved across the reorder.
    const b = stored.find((s) => s.id === 'b')!;
    expect(b.favicon).toBe('https://b.com/icon.png');
    expect(b.group).toBeUndefined();
  });

  it('rewrites the order field sequentially', async () => {
    const initial = makeShortcuts([
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2 },
    ]);
    const { getStored } = mockChromeStorage({ shortcuts: initial });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reorderShortcuts([
        { ...initial[2], order: 0 },
        { ...initial[0], order: 1 },
        { ...initial[1], order: 2 },
      ]);
    });
    const stored = getStored();
    expect(stored.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(stored.map((s) => s.order)).toEqual([0, 1, 2]);
  });
});

describe('useShortcuts — refreshShortcuts', () => {
  beforeEach(() => mockChromeStorage());

  it('re-reads storage and updates React state', async () => {
    const seed = makeShortcuts([{ id: 'a', order: 0 }]);
    const { getStored } = mockChromeStorage({ shortcuts: seed });
    const { result } = renderHook(() => useShortcuts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate an external write (e.g. background script after a quick-add).
    seed.push(makeShortcut({ id: 'external', url: 'https://external.com', order: 1 }));
    (chrome.storage.local.set as unknown as ReturnType<typeof vi.fn>)({ browsermain_shortcuts: seed });

    await act(async () => {
      await result.current.refreshShortcuts();
    });
    expect(getStored()).toHaveLength(2);
  });
});

describe('importShortcutsFromJson', () => {
  beforeEach(() => mockChromeStorage());

  it('imports new shortcuts and dedupes by url', async () => {
    const seed = makeShortcuts([{ id: 'a', url: 'https://a.com', order: 0 }]);
    const { getStored } = mockChromeStorage({ shortcuts: seed });
    const file = new File(
      [JSON.stringify({ shortcuts: [
        { title: 'A duplicate', url: 'https://a.com' },
        { title: 'New site', url: 'https://new.com' },
      ] })],
      'import.json',
      { type: 'application/json' },
    );
    const result = await importShortcutsFromJson(file);
    expect(result.imported).toBe(1);
    expect(getStored()).toHaveLength(2);
    expect(getStored().find((s) => s.url === 'https://new.com')).toBeDefined();
  });

  it('reports an error for invalid JSON', async () => {
    const file = new File(['not json at all'], 'bad.json', { type: 'application/json' });
    const result = await importShortcutsFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.error).toBeDefined();
  });
});
