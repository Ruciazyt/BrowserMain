# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrowserMain is a Manifest V3 browser extension (Chrome/Edge/Firefox) that replaces the default new tab page with a feature-rich dashboard. Originally retro-futuristic with LED-matrix aesthetics, it has grown into a dashboard with shortcuts, search, weather, market indices, news, RSS, AI chat, Matrix chat, and a pixel pet.

The repository is a pnpm workspace-style project: the extension itself lives entirely inside `website/`; the repo root holds supporting docs (`README.md`, `SPEC.md`, `DESIGN.md`), `process_images.py`, and `.github/workflows/`.

## Common Commands

All commands run from inside `website/` (Node 22, pnpm 10; see `website/.nvmrc`):

```bash
cd website
pnpm install
pnpm dev        # Vite dev server (loads the new tab in a regular browser tab)
pnpm build      # tsc typecheck + vite build + copy manifest.json + copy src/background into dist/
pnpm preview    # Serve the built dist/ for smoke testing
```

There is **no test runner and no linter configured**. The only correctness gate is `tsc --noEmit` invoked as the first step of `pnpm build`. CI (`.github/workflows/build-extension.yml`) runs `pnpm install --frozen-lockfile` then `pnpm build` on every push/PR to `main` and publishes a `browser-main.zip` release on main.

The build script (`package.json`) is unusual: after `vite build` it manually copies `manifest.json` and `src/background/` into `dist/`. Do not "simplify" this — Vite does not know about extension assets.

## High-Level Architecture

Two runtime surfaces, both built from `website/src/`:

### 1. New-tab page (`src/newtab/`)

The React 19 app rendered in `index.html` (set as `chrome_url_overrides.newtab` in `manifest.json`).

- `index.tsx` — boots React, wraps `App` in `<SettingsProvider>`.
- `App.tsx` — top-level layout. Composes Sidebar + SearchBar + Weather/Market/News widgets + ShortcutGrid + PixelPet + SettingsPanel + AddShortcutDialog + OnboardingGuide. Owns UI-only state (panels open, sidebar collapsed, nav). Subscribes to `chrome.runtime.onMessage('SHORTCUT_ADDED')` to refresh shortcuts after background-script writes.
- `hooks/useShortcuts.ts` — read/mutate the shortcut list in `chrome.storage.local`. **Mutations re-read from storage before writing** to avoid stale-closure races when several updates fire back-to-back.
- `hooks/useSettings.ts` — React Context provider for user settings. Read from `chrome.storage.sync` with a one-time fallback to `local` (migration from an older storage layout). All `update*` callbacks use functional `setSettings(prev => …)` updates for the same race-avoidance reason.
- `utils/storage.ts` — typed wrappers around `chrome.storage.*` plus favicon resolution helpers (`getFaviconUrl`, `getSmartFaviconUrl` via Google S2, `getChromeFaviconUrl` round-trips the background worker).
- `utils/engines.ts` — search engine config (Google/Bing/Baidu/DuckDuckGo).
- `i18n.ts` — locale strings (`'system' | 'zh-CN' | 'en'`).
- `components/` — feature folders, each owning its own CSS module (no shared design-system package):
  - `layout/Sidebar/` — collapsible left nav
  - `search/SearchBar/` — top search input
  - `shortcuts/{ShortcutGrid,ShortcutTile,AddShortcutDialog,BookmarkImport,ShortcutImport,_shared}/` — drag-to-reorder grid powered by SortableJS, bookmark import via `chrome.bookmarks.getTree`, JSON import/export
  - `widgets/{Clock,DailyQuote,Greeting,LEDDisplay,MarketIndices,NewsSection,WeatherWidget}/`
  - `settings/{SettingsPanel,OnboardingGuide,RssFeedManager}/` — slide-in settings panel, onboarding tour, RSS manager
  - `pet/PixelPet/` — multi-species pixel art pet
  - Top-level files: `MatrixChatPage.tsx` (Matrix JS SDK client, runs in the newtab page directly), `AIChatTab.tsx`, `PixelPet.tsx`
- `global.css` + `App.module.css` — base styles. The project uses CSS Modules per component.

### 2. Background service worker (`src/background/background.js`)

A **classic script** (not an ES module — MV3 service workers don't support `import`/`export`). It is copied verbatim into `dist/background/` by the build script. It:

- Listens for `chrome.action.onClicked` and `chrome.commands.onCommand` (`add-shortcut`, `quick-add-shortcut`) to open the quick-add popup or add a shortcut directly.
- Builds an extension URL with `?add_url&add_title&add_favicon` query params that the newtab page picks up via `App.tsx`'s URL-param effect.
- Owns the canonical shortcut list when adding via toolbar/commands (uses `chrome.favicons` API + `getSmartFaviconUrl` fallback).
- Bridges CORS-blocked requests for the newtab page: `FETCH_RSS`, `FETCH_URL`.
- Notifies the newtab page with `chrome.runtime.onMessage('SHORTCUT_ADDED')` after writes.

The background file **duplicates** the favicon helpers from `utils/storage.ts` (see comment at top: "inlined from ../newtab/utils/storage.ts"). When changing favicon logic, update both copies.

### Storage layout

- `chrome.storage.local['browsermain_shortcuts']` — full shortcut list (unlimited quota)
- `chrome.storage.sync['browsermain_settings']` — settings (synced across devices)
- `chrome.storage.local['browsermain_first_run']` — onboarding trigger
- Separate keys for Matrix/AI config in `utils/matrixStorage.ts` and `utils/aiStorage.ts`.

### Manifest V3 specifics (`website/manifest.json`)

- Permissions: `storage`, `tabs`, `bookmarks`, `activeTab`, `identity`.
- `host_permissions` are hardcoded to internal services (momoyu, eastmoney, a local IP, matrix-local). Edit them when adding new cross-origin features.
- `web_accessible_resources` whitelists `assets/*` and `icons/*`.
- Three keyboard commands are defined: `_execute_action` (toolbar click), `add-shortcut`, `quick-add-shortcut`.

## Gotchas to Remember

- `tsconfig.json` excludes `src/components`, `src/App.tsx`, `src/App.css`, `src/global.less`, `src/modern-app-env.d.ts`, `src/.eslintrc.json` — these are legacy leftovers from the prior Modern.js scaffold; do not import from them.
- TypeScript `strict` is on. `noUnusedLocals`/`noUnusedParameters` are off.
- All storage mutations must use functional updaters (see comment in `useShortcuts.ts` line 14–16 and `useSettings.ts` line 48–49). New hooks should follow the same pattern.
- The favicon pipeline is three-stage: `getChromeFaviconUrl` (background) → `getSmartFaviconUrl` (Google S2) → `getFaviconIcoUrl` (host `/favicon.ico`). Callers usually wire all three into an `<img>` with cascading `onError` fallbacks.
- The Matrix chat client (`matrix-js-sdk`) runs in the newtab page directly — there is no worker-side bridge.
- `process_images.py` at the repo root is a one-off image-processing script (not part of the build).
