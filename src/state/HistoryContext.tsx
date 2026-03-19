import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SleepEntry } from '../storage/historyStorage';
import { loadHistory } from '../storage/historyStorage';

type HistoryContextValue = {
  entries: SleepEntry[];
  refresh: () => Promise<void>;
  loading: boolean;
};

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const state = await loadHistory();
    setEntries(state.entries);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(() => ({ entries, refresh, loading }), [entries, refresh, loading]);
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}

