import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GlobalState {
  selectedProjectId: string;
  selectedCurrencyCode: string;
  
  // Actions
  setSelectedProjectId: (projectId: string) => void;
  setSelectedCurrencyCode: (currencyCode: string) => void;
  resetGlobalContext: () => void;
}

/**
 * Global Context Store
 * Maintains the shared state (Project, Currency) across the entire application.
 * Persisted in sessionStorage to survive refreshes while isolating tabs.
 */
const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      selectedProjectId: 'all',
      selectedCurrencyCode: 'USD',

      setSelectedProjectId: (projectId: string) => set({ selectedProjectId: projectId }),
      setSelectedCurrencyCode: (currencyCode: string) => set({ selectedCurrencyCode: currencyCode }),
      
      resetGlobalContext: () => set({ selectedProjectId: 'all', selectedCurrencyCode: 'USD' }),
    }),
    {
      name: 'sentinelfi-global-context',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useGlobalStore;
