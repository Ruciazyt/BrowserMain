import { vi } from 'vitest';
import type { Shortcut } from '../newtab/utils/storage';

/**
 * In-memory mock of chrome.storage.local + chrome.storage.sync + the
 * runtime message bus. Tests can pre-seed `seed` and assert against
 * `getStored()` after async mutations.
 */
export function mockChromeStorage(seed: { shortcuts?: Shortcut[]; settings?: unknown } = {}) {
  let local: Record<string, unknown> = { browsermain_shortcuts: seed.shortcuts ?? [] };
  let sync: Record<string, unknown> = seed.settings ? { browsermain_settings: seed.settings } : {};

  const onMessageListeners: Array<(msg: any, sender: any, sendResponse: any) => void | boolean> = [];

  const storageArea = (bucket: Record<string, unknown>) => ({
    get: vi.fn((keys: string | string[] | null, cb?: (result: any) => void) => {
      const result: Record<string, unknown> = {};
      const want = keys == null ? Object.keys(bucket) : Array.isArray(keys) ? keys : [keys];
      for (const k of want) {
        if (k in bucket) result[k] = bucket[k];
      }
      // Chrome's storage.get with a single string key returns the value
      // directly when called without callback shape. With a callback the
      // callback is invoked synchronously. We support the callback form.
      if (cb) cb(result);
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>, cb?: () => void) => {
      Object.assign(bucket, items);
      if (typeof cb === 'function') cb();
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[], cb?: () => void) => {
      const want = Array.isArray(keys) ? keys : [keys];
      for (const k of want) delete bucket[k];
      if (typeof cb === 'function') cb();
      return Promise.resolve();
    }),
    clear: vi.fn((cb?: () => void) => {
      for (const k of Object.keys(bucket)) delete bucket[k];
      if (typeof cb === 'function') cb();
      return Promise.resolve();
    }),
  });

  const localApi = storageArea(local);
  const syncApi = storageArea(sync);

  // Chrome's storage.local.get is overloaded: the call sites in storage.ts
  // pass a single key + callback (not an object). The shim above supports
  // both shapes via `Array.isArray(keys) ? keys : [keys]`. Good.

  (globalThis as any).chrome = {
    storage: {
      local: localApi,
      sync: syncApi,
      // NewsSection subscribes to storage.onChanged to live-refresh when
      // the feed list changes. The mock just records listeners; tests
      // that care about cross-component reactivity can call them directly.
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    runtime: {
      // Chrome's runtime.sendMessage is overloaded: legacy callers pass a
      // callback (the mock in storage.ts does this for GET_FAVICON); MV3
      // callers `await chrome.runtime.sendMessage(...)` and expect a
      // Promise. We satisfy both shapes so production code can keep using
      // whichever API it wants and tests can `mockResolvedValue(...)`.
      sendMessage: vi.fn((_msg: any, cb?: (response: any) => void) => {
        const response = { favicon: '' };
        if (cb) cb(response);
        return Promise.resolve(response) as any;
      }),
      onMessage: {
        addListener: vi.fn((fn: any) => {
          onMessageListeners.push(fn);
        }),
        removeListener: vi.fn((fn: any) => {
          const i = onMessageListeners.indexOf(fn);
          if (i >= 0) onMessageListeners.splice(i, 1);
        }),
      },
    },
    tabs: {
      query: vi.fn((_q: any, cb: (tabs: any[]) => void) => cb([])),
      update: vi.fn(),
      create: vi.fn(),
    },
    bookmarks: {
      getTree: vi.fn((cb: (tree: any[]) => void) => cb([])),
    },
  };

  return {
    getStored: () => local.browsermain_shortcuts as Shortcut[],
    getSettings: () => sync.browsermain_settings,
    getMessageListeners: () => onMessageListeners,
  };
}

export function makeShortcut(overrides: Partial<Shortcut> = {}): Shortcut {
  return {
    id: overrides.id ?? `id-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? 'Untitled',
    url: overrides.url ?? 'https://example.com',
    order: overrides.order ?? 0,
    group: overrides.group,
    favicon: overrides.favicon,
  };
}

export function makeShortcuts(spec: Array<Partial<Shortcut>>): Shortcut[] {
  return spec.map((s, i) => makeShortcut({ ...s, order: s.order ?? i }));
}
