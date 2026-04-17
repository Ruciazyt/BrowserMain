import { useState, useEffect, useCallback } from 'react';
import { Settings, BackgroundConfig, getSettings, saveSettings } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    defaultEngine: 'google',
    background: { type: 'solid', color: '#0a0a0f' },
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

  return {
    settings,
    loading,
    updateEngine,
    updateBackground,
  };
}