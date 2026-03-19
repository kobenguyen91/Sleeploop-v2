import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FlexibilityMinutes } from '../services/sleepCalculator';

// Thêm weekendMode và silentMode vào khuôn mẫu
export interface Settings {
  targetWakeHour: number;
  targetWakeMinute: number;
  flexibilityMinutes: FlexibilityMinutes;
  sleepLatencyMinutes: number;
  remindersEnabled: boolean;
  weekendMode: boolean; // Mới thêm
  silentMode: boolean;  // Mới thêm
}

const STORAGE_KEY = 'sleeploop_settings';

export const defaultSettings: Settings = {
  targetWakeHour: 7,
  targetWakeMinute: 0,
  flexibilityMinutes: 15,
  sleepLatencyMinutes: 15,
  remindersEnabled: true,
  weekendMode: false, // Mặc định tắt
  silentMode: false,  // Mặc định tắt
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}