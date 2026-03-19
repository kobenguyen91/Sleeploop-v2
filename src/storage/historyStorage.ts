import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from './keys';

export type SleepEntry = {
  id: string;
  kind: 'sleep' | 'nap';
  createdAt: number;
  sleepStartAt: number;
  plannedWakeAt: number;
  cyclesPlanned?: number;
  wakeAt?: number; // set when user taps alarm notification
  durationMinutes?: number; // for naps
};

type HistoryState = {
  entries: SleepEntry[];
};

const defaultState: HistoryState = { entries: [] };

export async function loadHistory(): Promise<HistoryState> {
  const raw = await AsyncStorage.getItem(storageKeys.history);
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as HistoryState;
    if (!parsed || !Array.isArray(parsed.entries)) return defaultState;
    return parsed;
  } catch {
    return defaultState;
  }
}

export async function saveHistory(state: HistoryState) {
  await AsyncStorage.setItem(storageKeys.history, JSON.stringify(state));
}

export async function addEntry(entry: SleepEntry) {
  const state = await loadHistory();
  const next: HistoryState = { entries: [entry, ...state.entries].slice(0, 120) };
  await saveHistory(next);
}

export async function markEntryWoke(id: string, wakeAt: number) {
  const state = await loadHistory();
  const next = {
    entries: state.entries.map((e) => (e.id === id ? { ...e, wakeAt } : e)),
  };
  await saveHistory(next);
}

export function computeStats(entries: SleepEntry[], now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * dayMs;
  const recent = entries.filter((e) => e.createdAt >= weekAgo && e.kind === 'sleep');

  const cycles = recent
    .map((e) => e.cyclesPlanned ?? 0)
    .filter((n) => Number.isFinite(n) && n > 0);

  const weeklyAverageCycles = cycles.length ? cycles.reduce((a, b) => a + b, 0) / cycles.length : 0;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const today = entries.filter((e) => e.createdAt >= todayStart.getTime() && e.kind === 'sleep');
  const todayCycles = today.reduce((sum, e) => sum + (e.cyclesPlanned ?? 0), 0);

  return { todayCycles, weeklyAverageCycles, recentCount: recent.length };
}

