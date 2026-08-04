import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { mockChromeStorage } from './mocks';

// jsdom ships without `crypto`; jsdom 25+ does provide `globalThis.crypto`.
// If it is somehow missing, fall back to a minimal UUID generator. We avoid
// importing `node:crypto` here to keep this file browser-shaped and to
// prevent the `node` types from leaking into the typecheck (the project
// does not depend on @types/node).
if (!(globalThis as any).crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
    },
    configurable: true,
  });
}

// Wire up the chrome.* globals before any module under test runs. The
// extension code touches these at module-evaluation time (e.g. useShortcuts
// reads storage on mount), so they have to be present from the start.
beforeEach(() => {
  mockChromeStorage();
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  if (!(globalThis as any).ResizeObserver) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});
