import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as uuid from 'uuid';

export type TimeRangeKey = '7d' | '30d' | 'quarter' | 'year';

export const TIME_RANGE_PRESETS: Record<TimeRangeKey, { label: string; labelLong: string; days: number }> = {
  '7d': { label: 'Last 7 days', labelLong: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 days', labelLong: 'Last 30 Days', days: 30 },
  quarter: { label: 'This quarter', labelLong: 'This Quarter', days: 90 },
  year: { label: 'This year', labelLong: 'This Year', days: 365 },
};

export interface SavedView {
  id: string;
  name: string;
  projectId: string;
  timeRange: TimeRangeKey;
}

interface GlobalState {
  selectedProjectId: string;
  selectedCurrencyCode: string;
  timeRange: TimeRangeKey;
  savedViews: SavedView[];

  // Actions
  setSelectedProjectId: (projectId: string) => void;
  setSelectedCurrencyCode: (currencyCode: string) => void;
  setTimeRange: (range: TimeRangeKey) => void;
  saveView: (name: string) => void;
  applyView: (id: string) => void;
  deleteView: (id: string) => void;
  resetGlobalContext: () => void;
}

/**
 * Global Context Store
 * Maintains the shared state (Project, Currency, TimeRange) across the entire application.
 * Persisted in sessionStorage to survive refreshes while isolating tabs.
 */
const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      selectedProjectId: 'all',
      selectedCurrencyCode: 'USD',
      timeRange: '30d',
      savedViews: [],

      setSelectedProjectId: (projectId: string) => set({ selectedProjectId: projectId }),
      setSelectedCurrencyCode: (currencyCode: string) => set({ selectedCurrencyCode: currencyCode }),
      setTimeRange: (range: TimeRangeKey) => set({ timeRange: range }),

      saveView: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const { selectedProjectId, timeRange, savedViews } = get();
        const view: SavedView = { id: uuid.v4(), name: trimmed, projectId: selectedProjectId, timeRange };
        set({ savedViews: [...savedViews.filter((v) => v.name !== trimmed), view] });
      },
      applyView: (id: string) => {
        const view = get().savedViews.find((v) => v.id === id);
        if (!view) return;
        set({ selectedProjectId: view.projectId, timeRange: view.timeRange });
      },
      deleteView: (id: string) => {
        set((state) => ({ savedViews: state.savedViews.filter((v) => v.id !== id) }));
      },

      resetGlobalContext: () => set({ selectedProjectId: 'all', selectedCurrencyCode: 'USD', timeRange: '30d' }),
    }),
    {
      name: 'sentinelfi-global-context',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useGlobalStore;
