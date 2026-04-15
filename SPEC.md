# BrowserMain - Browser Extension Spec

## 1. Project Overview

**Name:** BrowserMain  
**Type:** Browser Extension (Chrome/Edge Chromium-based)  
**Core Function:** Replace the browser's default new tab page with a feature-rich, aesthetically distinctive dashboard.  
**Target Users:** Power users, developers, and anyone who wants a more functional and visually interesting new tab page.

### Core Value Proposition
A pixel/geek-inspired new tab page with LED-matrix aesthetics that combines quick navigation (shortcuts), search, and personal utility (clock, bookmarks) in a single, cohesive interface.

---

## 2. Visual Design

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Background | Deep Black | `#0a0a0f` | Page/app background |
| LED Primary | Amber Orange | `#ff9500` | Primary accent, glow effects, active states |
| LED Secondary | Warm Amber | `#ffb347` | LED dot-matrix, secondary highlights |
| Panel Body | Pale Turquoise | `#7dd3e8` | Card/panel backgrounds |
| Panel Border | Dark Turquoise | `#5bb8d4` | Panel borders |
| Text Primary | Light Gray | `#9ca3af` | Secondary text, labels |
| Text Bright | White Smoke | `#f5f5f5` | Primary text on dark |
| Success | Terminal Green | `#4ade80` | Success states |
| Danger | Coral Red | `#ff6b6b` | Delete, error states |

### Typography

- **LED/Code Text:** `JetBrains Mono` (Google Fonts) — monospace, used for clock, LED display, tech labels
- **UI Text:** `Inter` (Google Fonts) — clean sans-serif for buttons, labels, body copy

### Spatial System

- **Border Radius:** Heavy rounded — `24px` for cards, `16px` for buttons, `12px` for inputs
- **Spacing Unit:** `8px` base grid
- **Card Padding:** `16px` to `24px`
- **Gaps:** `12px` between shortcut tiles, `24px` between major sections

### Visual Effects

- **LED Glow:** `box-shadow: 0 0 12px #ff9500, 0 0 24px rgba(255,149,0,0.3)` on amber elements
- **Dot-Matrix Grid:** Decorative 8×8 grid of small amber circles (`6px` diameter, `12px` spacing) used as panel accents
- **Panel Styling:** Turquoise background with subtle inner glow/gradient (`rgba(125,211,232,0.1)` to transparent)
- **Hover States:** Slight scale (`1.05`) + intensified glow on interactive elements
- **Transitions:** `200ms ease-out` for all interactive states

---

## 3. Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────┐  │
│  │            🔍 Search Bar (top center)        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  LED Display (decorative dot-matrix panel)  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         Shortcut Grid (draggable)          │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │   │
│  │  │ 🌐 │ │ 📧 │ │ 📁 │ │ 📅 │ │ ⚙️ │        │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────┐  ┌────────────────────┐   │
│  │    Clock (digital)  │  │  Settings Toggle   │   │
│  └─────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- **Full viewport height**, no scroll needed for primary content
- **Centered layout**, max-width `960px` for content area
- **Settings Panel**: slides in from the right as an overlay panel

---

## 4. Features & Interactions

### 4.1 Search Bar

- **Position:** Top center, prominent
- **Engine Switcher:** Dropdown on the left of input (Google/Bing/Baidu/DuckDuckGo icons)
- **Input:** LED-styled border, amber focus glow, placeholder text "Search or enter URL..."
- **Submission:** Enter key triggers search with selected engine; URL input auto-detected
- **Keyboard:** `Ctrl+K` focuses the search bar from anywhere

### 4.2 Clock

- **Format:** `HH:MM:SS` (24h) with JetBrains Mono font, LED glow effect
- **Date:** Below clock, smaller text, format `YYYY-MM-DD`
- **Update:** Every second via `setInterval`

### 4.3 LED Display (Decorative)

- **Content:** 8×8 dot-matrix grid of amber circles
- **Purpose:** Purely decorative, retro-futuristic aesthetic
- **Animation:** Subtle pulse glow (CSS animation, 2s cycle)

### 4.4 Shortcut Grid

- **Layout:** Responsive grid, auto-fill columns, min tile width `96px`
- **Tile Content:** Favicon + title (max 2 lines, ellipsis overflow)
- **Click:** Opens URL in current tab
- **Right-click context menu:** Edit title, Edit URL, Delete
- **Drag to reorder:** HTML5 drag API, drop indicator glow

### 4.5 Quick Add

- **Trigger:** Browser action button (toolbar icon) opens a popup/dialog
- **Form:** URL field (pre-filled from current tab), Title field (auto-fetched), confirm button
- **Persistence:** Saves to chrome.storage.sync

### 4.6 Bookmark Import

- **Trigger:** Button in Settings panel
- **Action:** Calls `chrome.bookmarks.getTree()`, presents checklist of bookmark folders
- **Selection:** User picks folders to import; each becomes a shortcut group
- **Conflict:** Duplicate URLs are ignored

### 4.7 Custom Background

- **Options:**
  - Solid color (color picker)
  - Gradient (two-color picker + direction selector)
  - Image (upload or URL)
- **Persistence:** `chrome.storage.sync`

### 4.8 Settings Panel

- **Trigger:** Gear icon button (bottom right)
- **Appearance:** Slide-in from right, `320px` wide, full height overlay
- **Sections:**
  - Search Engine (default engine selector)
  - Background (type + options)
  - Bookmarks (import/export)
  - About (version info)
- **Close:** Click outside or X button

---

## 5. Component Inventory

| Component | States | Description |
|-----------|--------|-------------|
| `SearchBar` | default, focused, typing | Top search with engine switcher |
| `EngineSwitcher` | open, closed, item-selected | Dropdown for engine selection |
| `Clock` | running | Digital clock, updates every second |
| `LEDDisplay` | idle, pulsing | Decorative dot-matrix panel |
| `ShortcutGrid` | empty, populated, dragging | Grid container for tiles |
| `ShortcutTile` | default, hover, dragging, editing | Individual shortcut card |
| `SettingsPanel` | open, closed | Slide-in settings overlay |
| `BackgroundPicker` | solid, gradient, image | Background type selector |
| `AddShortcutDialog` | open, closed | Quick-add form dialog |

---

## 6. Technical Approach

### Architecture

- **Framework:** React 17 (existing)
- **Language:** TypeScript
- **Bundler:** Modern.js (existing) → build output used as extension files
- **Styling:** Plain CSS (no Tailwind) + CSS Modules per component

### Browser Extension Structure

```
website/
├── manifest.json           # MV3 extension manifest
├── src/
│   ├── newtab/
│   │   ├── App.tsx          # Main new tab app
│   │   ├── index.tsx        # Entry point
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── EngineSwitcher.tsx
│   │   │   ├── Clock.tsx
│   │   │   ├── LEDDisplay.tsx
│   │   │   ├── ShortcutGrid.tsx
│   │   │   ├── ShortcutTile.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── BackgroundPicker.tsx
│   │   │   └── AddShortcutDialog.tsx
│   │   ├── hooks/
│   │   │   ├── useShortcuts.ts
│   │   │   └── useSettings.ts
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── led-theme.css
│   │   │   └── components/
│   │   │       ├── SearchBar.module.css
│   │   │       ├── Clock.module.css
│   │   │       ├── LEDDisplay.module.css
│   │   │       ├── ShortcutGrid.module.css
│   │   │       └── SettingsPanel.module.css
│   │   └── utils/
│   │       ├── engines.ts
│   │       ├── storage.ts
│   │       └── chrome.ts
├── public/
│   └── icons/              # Extension icons
└── background.js            # Service worker (separate build)
```

### State Management

- **Shortcuts:** `chrome.storage.local` (unlimited quota for shortcuts)
- **Settings:** `chrome.storage.sync` (user preferences, background)
- **No external state library needed** — React hooks + Context for settings panel open/close

### Key APIs Used

- `chrome.storage.sync` / `chrome.storage.local`
- `chrome.bookmarks.getTree()`
- `chrome.tabs.query()` (for quick-add current page URL)
- `chrome.runtime.getURL()` (for default icons)
- `chrome.runtime.onInstalled` (first-run onboarding placeholder)

### Build Output

Modern.js outputs to `dist/` directory. For the extension, we configure it to output a static site that the `chrome_url_overrides: newTab` can reference.

---

## 7. Constraints & Decisions

1. **No Tailwind** — using plain CSS with CSS Modules for component isolation
2. **No external state library** — React Context + hooks only
3. **No backend** — all data in browser storage
4. **Keep existing Modern.js setup** — just add the extension manifest and restructure src/
5. **Inline SVG icons** — no external icon library to minimize dependencies
6. **Manifest V3** — target modern Chromium browsers (Chrome 88+, Edge 88+)