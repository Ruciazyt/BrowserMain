# BrowserMain

A retro-futuristic browser new tab extension with LED-matrix aesthetics. Replaces your browser's default new tab page with a feature-rich dashboard featuring amber LED glow effects, shortcut grid, search bar, and customizable background.

![BrowserMain Preview](website/src/assets/preview.png)

## Features

- **🔍 Search Bar** - Quick search with engine switching (Google, Bing, Baidu, DuckDuckGo)
- **⏰ LED Clock** - Digital clock with retro LED font styling
- **✨ LED Display** - Decorative 8×8 dot-matrix amber panel with pulse animation
- **⚡ Shortcut Grid** - Drag-to-reorder shortcuts with right-click context menu editing
- **📁 Bookmark Import** - Import bookmarks from browser with folder tree selection
- **🎨 Custom Background** - Solid color, gradient (4 directions), or image background
- **⌨️ Keyboard Shortcuts** - `Ctrl+K` to focus search, arrow keys to reorder shortcuts

## Tech Stack

- **React 17** + **TypeScript**
- **Vite** - Fast builds and hot reload
- **CSS Modules** - Scoped styling with LED glow effects

## Getting Started

### Prerequisites

- Node.js 22+ (use `.nvmrc` for version)
- pnpm

### Install

```bash
cd website
pnpm install
```

### Development

```bash
pnpm dev
```

Open your browser and load the extension in development mode.

### Build

```bash
pnpm build
```

Output is in `dist/` directory.

## Installing the Extension

### Chrome/Edge (Chromium-based)

1. Build the project: `pnpm build`
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `dist/` folder

### Firefox

1. Build the project: `pnpm build`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `dist/manifest.json`

## Project Structure

```
BrowserMain/
├── website/
│   ├── src/
│   │   ├── newtab/
│   │   │   ├── App.tsx           # Main app component
│   │   │   ├── components/       # UI components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── styles/            # CSS modules + themes
│   │   │   └── utils/             # Storage, engines config
│   │   ├── background/            # Service worker
│   │   └── assets/                # Static assets
│   ├── index.html                 # Entry HTML
│   ├── vite.config.ts            # Vite configuration
│   └── manifest.json             # Chrome extension manifest
└── .github/workflows/            # CI/CD
```

## GitHub Actions

Every push to `main` triggers an automatic build. The workflow:

1. Checkout code
2. Setup Node.js 22
3. Install dependencies (pnpm)
4. Build extension
5. Upload artifacts

Release tags (`v*.*.*`) automatically create a `.zip` for distribution.

## License

MIT
