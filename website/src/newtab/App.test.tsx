import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SettingsProvider } from './hooks/useSettings';
import { mockChromeStorage } from '../test/mocks';
import App from './App';

// jsdom ships a `window.matchMedia` stub that doesn't return a
// MediaQueryList with `.matches`. App.tsx's sidebar-collapse effect
// reads `.matches` synchronously inside the effect callback, so
// rendering App without overriding it throws. Force-override here so
// the test is self-contained — other tests that don't need matchMedia
// (the hook tests) are unaffected.
const matchMediaStub = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// These tests pin the two things App.tsx has to get right for the home
// page to render without the "opacity during animation vs after" jump
// the CSS-rule tests already guard at the stylesheet level:
//
//   1. The page root must carry an inline `style` whose CSS variables
//      match the user's `--glass-card-*` settings from the very first
//      paint. If a future refactor moves glassStyle elsewhere (a CSS
//      var on `:root`, a theme provider, etc.) and forgets to keep it
//      on the page root, cards lose their per-page cascade and the
//      backdrop-filter stays at `@property` defaults. These tests
//      catch that.
//
//   2. During loading (shortcuts / settings still resolving) the
//      early-return branch must still render the same `.page` wrapper
//      (so the variables stay applied while loading-dots show). The
//      page div must keep `glassStyle` applied — that way, the moment
//      shortcuts + settings resolve and React swaps the tree to the
//      full layout, the cards mount under the same parent and inherit
//      the user's final values without an interpolated transition.
//
// We render App inside <SettingsProvider> (App.tsx itself imports the
// hook, so the provider wraps it via the same React tree the real app
// uses).

describe('App — page root carries glassStyle through loading → loaded', () => {
  beforeEach(() => {
    mockChromeStorage();
    window.matchMedia = vi.fn().mockImplementation(matchMediaStub) as any;
  });

  it('renders a .page wrapper with a non-empty inline style during loading', () => {
    // Seed chrome.storage so neither load resolves synchronously — we
    // want to observe the loading-state early return.
    mockChromeStorage({});
    const { container } = render(
      <SettingsProvider>
        <App />
      </SettingsProvider>,
    );
    const page = container.querySelector('div');
    expect(page, 'App should render at least one <div>').not.toBeNull();
    // The loading branch keeps the glassStyle inline style applied on
    // the page root so the cascade is established before cards mount.
    const style = page!.getAttribute('style') ?? '';
    expect(
      style,
      'page root must carry --glass-card-* CSS variables while loading',
    ).toMatch(/--glass-card-opacity\s*:/);
    expect(style).toMatch(/--glass-card-blur\s*:/);
    expect(style).toMatch(/--glass-card-saturation\s*:/);
    expect(style).toMatch(/--glass-card-shadow-intensity\s*:/);
    expect(style).toMatch(/--glass-card-tint-color\s*:/);
  });

  it('reflects user settings.glassOpacity in the page root inline style', async () => {
    // Custom settings — glassOpacity 0.4, blur 12px, saturation 200%,
    // shadow intensity 0.5, tint #ff0000. If a future change makes the
    // computed values diverge from the persisted settings, cards lose
    // their per-page glass treatment.
    mockChromeStorage({
      settings: {
        defaultEngine: 'google',
        background: { type: 'solid', color: '#0a0a0f' },
        locale: 'system',
        glassOpacity: 40,
        glassBlur: 12,
        glassSaturation: 200,
        glassShadowIntensity: 50,
        glassTintColor: '#ff0000',
      },
    });
    const { container } = render(
      <SettingsProvider>
        <App />
      </SettingsProvider>,
    );

    // Wait for settings + shortcuts to resolve and the full layout to
    // mount. We don't care about the cards' internal state — only the
    // page root's inline style.
    await waitFor(() => {
      const page = container.querySelector('div');
      const style = page?.getAttribute('style') ?? '';
      // Custom opacity should land as `0.4` (40 / 100), and the
      // background color in `bgStyle` should appear (the page also
      // carries a background value when settings.background is solid).
      return /--glass-card-opacity\s*:\s*0\.4/.test(style);
    });

    const page = container.querySelector('div');
    const style = page!.getAttribute('style') ?? '';
    expect(style).toMatch(/--glass-card-opacity\s*:\s*0\.4/);
    expect(style).toMatch(/--glass-card-blur\s*:\s*12px/);
    expect(style).toMatch(/--glass-card-saturation\s*:\s*200%/);
    expect(style).toMatch(/--glass-card-shadow-intensity\s*:\s*0\.5/);
    expect(style).toMatch(/--glass-card-tint-color\s*:\s*#ff0000/);
  });
});