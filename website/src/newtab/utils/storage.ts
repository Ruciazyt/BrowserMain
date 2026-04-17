// Chrome storage helpers

export interface Shortcut {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  order: number;
}

export interface Settings {
  defaultEngine: string;
  background: BackgroundConfig;
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: 'to top right' | 'to bottom right' | 'to bottom left' | 'to top left';
  imageUrl?: string;
}

const SHORTCUTS_KEY = 'browsermain_shortcuts';
const SETTINGS_KEY = 'browsermain_settings';

export function getFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    // First try direct favicon.ico on the domain
    return `https://${hostname}/favicon.ico`;
  } catch {
    return '';
  }
}

/**
 * Returns the best favicon URL for a given page URL.
 * Uses Google S2 (most reliable, handles edge cases) with favicon.ico fallback.
 * The caller should render this as an <img> and handle onError to cycle fallbacks.
 */
export function getSmartFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    const domain = encodeURIComponent(hostname);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * Returns favicon.ico URL as a fallback (used as second-stage fallback in ShortcutTile).
 */
export function getFaviconIcoUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://${hostname}/favicon.ico`;
  } catch {
    return '';
  }
}

export async function getShortcuts(): Promise<Shortcut[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SHORTCUTS_KEY, (result: any) => {
      resolve(result[SHORTCUTS_KEY] || []);
    });
  });
}

export async function saveShortcuts(shortcuts: Shortcut[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SHORTCUTS_KEY]: shortcuts }, resolve);
  });
}

// Read settings from chrome.storage.sync (per SPEC.md).
// For backward compatibility: if no sync data found, fall back to local.
export async function getSettings(): Promise<Settings> {
  const defaults: Settings = {
    defaultEngine: 'google',
    background: { type: 'solid', color: '#0a0a0f' },
  };
  return new Promise((resolve) => {
    (chrome.storage as any).sync.get(SETTINGS_KEY, (result: any) => {
      if (result[SETTINGS_KEY]) {
        resolve({ ...defaults, ...result[SETTINGS_KEY] });
      } else {
        // Fallback to local for existing users migrating from the old implementation
        (chrome.storage as any).local.get(SETTINGS_KEY, (localResult: any) => {
          resolve({ ...defaults, ...localResult[SETTINGS_KEY] });
        });
      }
    });
  });
}

// Save settings to chrome.storage.sync (per SPEC.md)
// Caller is responsible for merging the full Settings object.
// This function just persists what it receives (no read-then-write race condition).
export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    (chrome.storage as any).sync.set({ [SETTINGS_KEY]: settings }, resolve);
  });
}
