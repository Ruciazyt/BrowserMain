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
    await saveSettings({ defaultEngine: engineId });
    setSettings((s) => ({ ...s, defaultEngine: engineId }));
  }, []);

  const updateBackground = useCallback(async (background: BackgroundConfig) => {
    await saveSettings({ background });
    setSettings((s) => ({ ...s, background }));
  }, []);

  return {
    settings,
    loading,
    updateEngine,
    updateBackground,
  };
}