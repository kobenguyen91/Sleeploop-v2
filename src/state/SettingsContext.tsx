import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Settings } from '../storage/settingsStorage';
import { loadSettings, saveSettings, defaultSettings } from '../storage/settingsStorage';

type SettingsContextValue = {
  settings: Settings;
  setSettings: (next: Settings) => Promise<void>;
  loading: boolean;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Khởi tạo với defaultSettings đã có đủ các trường mới
  const [settings, setLocalSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings()
      .then((s) => {
        // Hợp nhất dữ liệu cũ với mặc định mới để tránh thiếu trường
        setLocalSettings(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const setSettings = useCallback(async (next: Settings) => {
    setLocalSettings(next);
    await saveSettings(next);
  }, []);

  const value = useMemo(() => ({ settings, setSettings, loading }), [settings, setSettings, loading]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}