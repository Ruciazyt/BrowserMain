import { createContext, createElement, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Settings, BackgroundConfig, getSettings, saveSettings } from '../utils/storage';

export type AppLocale = 'system' | 'zh-CN' | 'en';

interface AIConfigUpdate {
  aiEndpoint?: string;
  aiModel?: string;
  aiTemperature?: number;
  aiMaxTokens?: number;
}

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  updateEngine: (engineId: string) => Promise<void>;
  updateBackground: (background: BackgroundConfig) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateClockFormat: (clockIs24h: boolean) => Promise<void>;
  updateLocale: (locale: AppLocale) => Promise<void>;
  updateAIConfig: (config: AIConfigUpdate) => void;
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

  const updateAIConfig = useCallback((config: AIConfigUpdate) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...config };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  return {
    settings,
    loading,
    updateEngine,
    updateBackground,
    updateUserName,
    updateClockFormat,
    updateLocale,
    updateAIConfig,
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