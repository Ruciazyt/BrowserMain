import { createContext, createElement, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Settings, BackgroundConfig, getSettings, saveSettings } from '../utils/storage';

export type AppLocale = 'system' | 'zh-CN' | 'en';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  updateEngine: (engineId: string) => Promise<void>;
  updateBackground: (background: BackgroundConfig) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateClockFormat: (clockIs24h: boolean) => Promise<void>;
  updateLocale: (locale: AppLocale) => Promise<void>;
  updatePetSpecies: (species: 'brown' | 'orange' | 'white' | 'gray') => void;
  updateGlassOpacity: (opacity: number) => void;
  updateGlassBlur: (blur: number) => void;
  updateGlassSaturation: (saturation: number) => void;
  updateGlassShadowIntensity: (intensity: number) => void;
  updateGlassTintColor: (color: string) => void;
  updateVideoRefreshInterval: (ms: number) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function useSettingsState(): SettingsContextValue {
  const [settings, setSettings] = useState<Settings>({
    defaultEngine: 'google',
    background: { type: 'solid', color: '#0a0a0f' },
    locale: 'system',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  // Use functional updates to avoid stale-closure bugs when settings change
  // between the callback's creation and invocation.
  const updateEngine = useCallback(async (engineId: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev, defaultEngine: engineId };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateBackground = useCallback(async (background: BackgroundConfig) => {
    setSettings((prev) => {
      const newSettings = { ...prev, background };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateUserName = useCallback(async (name: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev, userName: name };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateClockFormat = useCallback(async (clockIs24h: boolean) => {
    setSettings((prev) => {
      const newSettings = { ...prev, clockIs24h };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateLocale = useCallback(async (locale: AppLocale) => {
    setSettings((prev) => {
      const newSettings = { ...prev, locale };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updatePetSpecies = useCallback((species: 'brown' | 'orange' | 'white' | 'gray') => {
    setSettings((prev) => {
      const newSettings = { ...prev, petSpecies: species };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateGlassOpacity = useCallback((opacity: number) => {
    setSettings((prev) => {
      const newSettings = { ...prev, glassOpacity: opacity };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateGlassBlur = useCallback((blur: number) => {
    setSettings((prev) => {
      const newSettings = { ...prev, glassBlur: blur };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateGlassSaturation = useCallback((saturation: number) => {
    setSettings((prev) => {
      const newSettings = { ...prev, glassSaturation: saturation };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateGlassShadowIntensity = useCallback((intensity: number) => {
    setSettings((prev) => {
      const newSettings = { ...prev, glassShadowIntensity: intensity };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const updateGlassTintColor = useCallback((color: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev, glassTintColor: color };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Note: this updater intentionally persists outside the setSettings reducer
  // (unlike the older updateGlass* callbacks above, which call saveSettings
  // inside the reducer). React 19 StrictMode warns when a reducer performs
  // side effects, so the new code keeps the reducer pure and persists after.
  // Re-reads via getSettings() before writing to avoid the same stale-closure
  // race documented in useShortcuts.ts:16-18.
  const updateVideoRefreshInterval = useCallback(async (ms: number) => {
    setSettings((prev) => ({ ...prev, videoRefreshIntervalMs: ms }));
    const current = await getSettings();
    await saveSettings({ ...current, videoRefreshIntervalMs: ms });
  }, []);

  return {
    settings,
    loading,
    updateEngine,
    updateBackground,
    updateUserName,
    updateClockFormat,
    updateLocale,
    updatePetSpecies,
    updateGlassOpacity,
    updateGlassBlur,
    updateGlassSaturation,
    updateGlassShadowIntensity,
    updateGlassTintColor,
    updateVideoRefreshInterval,
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const value = useSettingsState();
  return createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}