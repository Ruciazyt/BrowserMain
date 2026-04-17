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

  const updateEngine = useCallback(async (engineId: string) => {
    const newSettings = { ...settings, defaultEngine: engineId };
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  const updateBackground = useCallback(async (background: BackgroundConfig) => {
    const newSettings = { ...settings, background };
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  return {
    settings,
    loading,
    updateEngine,
    updateBackground,
  };
}