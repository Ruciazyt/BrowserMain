# BrowserMain Development Plan

## Overview
BrowserMain is a Chrome/Edge browser extension that replaces the default new tab page with a retro-futuristic LED-matrix aesthetic dashboard. Built with React 17 + TypeScript + Modern.js.

---

## Phase 1: Foundation ✅ (Completed)
**Goal:** Core UI with search, clock, LED display, shortcuts, settings panel.

### Features Implemented
- [x] `SPEC.md` — Full specification document
- [x] `manifest.json` — MV3 extension manifest with `chrome_url_overrides: newTab`
- [x] LED theme CSS (`global.css` + `led-theme.css`) — color palette, glow effects, dot-matrix decorations
- [x] `SearchBar` — Top search with engine switcher (Google/Bing/Baidu/DuckDuckGo)
- [x] `Clock` — Digital clock with LED font styling, updates every second
- [x] `LEDDisplay` — Decorative 8×8 dot-matrix amber panel with pulse animation
- [x] `ShortcutGrid` + `ShortcutTile` — Grid layout with hover delete, basic drag attributes
- [x] `SettingsPanel` — Slide-in right panel with engine selector, background picker
- [x] `useShortcuts` hook — CRUD operations via chrome.storage.local
- [x] `useSettings` hook — Settings via chrome.storage.sync
- [x] `engines.ts` — Search engine definitions + URL builder
- [x] `storage.ts` — Chrome storage helpers
- [x] `background.js` — Service worker with `onInstalled` and toolbar action handler

### Files Created/Modified
```
website/
├── manifest.json
├── src/
│   ├── App.tsx (redirect to newtab)
│   ├── newtab/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Clock.tsx
│   │   │   ├── LEDDisplay.tsx
│   │   │   ├── ShortcutGrid.tsx
│   │   │   ├── ShortcutTile.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useShortcuts.ts
│   │   │   └── useSettings.ts
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── led-theme.css
│   │   │   ├── App.module.css
│   │   │   └── components/
│   │   │       ├── SearchBar.module.css
│   │   │       ├── Clock.module.css
│   │   │       ├── LEDDisplay.module.css
│   │   │       ├── ShortcutGrid.module.css
│   │   │       ├── ShortcutTile.module.css
│   │   │       └── SettingsPanel.module.css
│   │   └── utils/
│   │       ├── engines.ts
│   │       └── storage.ts
│   └── background/
│       └── background.js
```

### Acceptance Criteria
- [x] Extension loads as new tab page
- [x] Search bar functional with engine switching
- [x] Clock displays and updates
- [x] LED display shows animated dot-matrix
- [x] Shortcuts display in grid (empty state if none)
- [x] Settings panel opens/closes

---

## Phase 2: Drag & Drop Reorder ✅ (Completed)
**Goal:** Full drag-and-drop reordering of shortcuts.

### Files to Create/Modify
- `ShortcutGrid.tsx` — Implement drag-over, drop zone, reordering logic
- `ShortcutTile.tsx` — Improve drag feedback with visual indicator
- `useShortcuts.ts` — Add `reorderShortcuts()` persistence
- `ShortcutGrid.module.css` — Add drop indicator styles

### Acceptance Criteria
- [x] Drag a tile, see it follow cursor with visual feedback
- [x] Drop between tiles shows insertion indicator
- [x] Order persists after page reload

### Dependencies
- Pure HTML5 Drag and Drop API (no external library)

---

## Phase 3: Bookmark Import ✅ (Completed)
**Goal:** Import bookmarks from browser into shortcuts.

### Files to Create/Modify
- `BookmarkImport.tsx` — New component: folder tree, checkboxes, import button
- `SettingsPanel.tsx` — Add "Import Bookmarks" section
- `background.js` — Add `chrome.bookmarks.getTree()` handler via messaging

### Acceptance Criteria
- [x] User can browse their bookmark tree
- [x] Multi-select folders to import
- [x] Duplicate URLs are skipped
- [x] Imported shortcuts appear in grid immediately

---

## Phase 4: Polish & Enhancements (TODO)
**Goal:** Smoother UX, edge cases, visual refinements.

### Features
1. **Quick Add Dialog** — Toolbar button popup to add current page as shortcut
2. **Edit Shortcut** — Inline edit on right-click (title/URL)
3. **Background Image Upload** — File picker → base64 → chrome.storage
4. **Gradient Direction Picker** — 4 preset directions (to right, to bottom, 135deg, 225deg)
5. **Favicon Fetching** — Use `chrome.tabs.get()` favicon for shortcuts without one
6. **Keyboard Shortcuts** — `Ctrl+K` focus search, `Esc` close settings
7. **Onboarding** — First-run placeholder (empty state with hints)
8. **Extension Icons** — Generate 16/32/48/128px icons in `public/icons/`

### Acceptance Criteria
- [ ] Quick add works from toolbar
- [ ] Edit shortcut inline
- [ ] Background image upload functional
- [ ] `Ctrl+K` focuses search from anywhere
- [ ] Extension icons present

---

## Build & Testing

### Dev Workflow
```bash
cd website
pnpm dev          # Dev server for live preview (http://localhost:8080)
pnpm build        # Production build → dist/
```

### Load in Chrome
1. `pnpm build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. "Load unpacked" → select `website/dist/`
5. Open new tab → BrowserMain appears

### Note on Modern.js
Modern.js outputs to `dist/` by default. For the extension, the `index.html` in `dist/` becomes the new tab page. The `manifest.json` must be in the root of the loaded extension directory. After build, copy `manifest.json` to `dist/` if needed.

---

## Technical Stack
- **Runtime:** React 17, TypeScript 4
- **Bundler:** Modern.js (`@modern-js/app-tools`)
- **Styling:** Plain CSS with CSS Modules (no Tailwind)
- **State:** `chrome.storage.local` (shortcuts) + `chrome.storage.sync` (settings)
- **Extension:** Manifest V3, Chrome 88+, Edge 88+