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
  gradientDirection?: 'to right top' | 'to right bottom' | 'to left bottom' | 'to left top';
  imageUrl?: string;
}

const SHORTCUTS_KEY = 'browsermain_shortcuts';
const SETTINGS_KEY = 'browsermain_settings';

export function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
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

export async function getSettings(): Promise<Settings> {
  const defaults: Settings = {
    defaultEngine: 'google',
    background: { type: 'solid', color: '#0a0a0f' },
  };
  return new Promise((resolve) => {
    (chrome.storage as any).sync.get(SETTINGS_KEY, (result: any) => {
      resolve({ ...defaults, ...result[SETTINGS_KEY] });
    });
  });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    (chrome.storage as any).sync.get(SETTINGS_KEY, (result: any) => {
      const current = result[SETTINGS_KEY] || {};
      (chrome.storage as any).sync.set(
        { [SETTINGS_KEY]: { ...current, ...settings } },
        resolve
      );
    });
  });
}
