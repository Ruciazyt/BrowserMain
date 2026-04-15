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
  gradientDirection?: 'to right' | 'to bottom' | '135deg';
  imageUrl?: string;
}

const SHORTCUTS_KEY = 'browsermain_shortcuts';
const SETTINGS_KEY = 'browsermain_settings';

export async function getShortcuts(): Promise<Shortcut[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SHORTCUTS_KEY, (result) => {
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
    chrome.storage.sync.get(SETTINGS_KEY, (result) => {
      resolve({ ...defaults, ...result[SETTINGS_KEY] });
    });
  });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(SETTINGS_KEY, (result) => {
      const current = result[SETTINGS_KEY] || {};
      chrome.storage.sync.set(
        { [SETTINGS_KEY]: { ...current, ...settings } },
        resolve
      );
    });
  });
}