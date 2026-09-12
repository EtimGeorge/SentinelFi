import { useState, useEffect, useCallback } from 'react';

export interface FilterState {
  [key: string]: any;
}

export interface SortState {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PersistedTableState {
  filters: FilterState;
  sort: SortState;
  page: number;
  limit: number;
}

const STORAGE_PREFIX = 'sentinelfi:table:';

export function usePersistedTableState(
  routeKey: string,
  defaultState: PersistedTableState = { filters: {}, sort: {}, page: 1, limit: 10 }
) {
  const storageKey = `${STORAGE_PREFIX}${routeKey}`;

  const [state, setState] = useState<PersistedTableState>(() => {
    if (typeof window === 'undefined') return defaultState;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultState, ...parsed };
      }
    } catch (e) {
      console.warn(`[usePersistedTableState] Failed to parse stored state for ${routeKey}:`, e);
    }
    return defaultState;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn(`[usePersistedTableState] Failed to persist state for ${routeKey}:`, e);
    }
  }, [storageKey, state]);

  const setFilters = useCallback((filters: FilterState) => {
    setState(prev => ({ ...prev, filters, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder?: 'ASC' | 'DESC') => {
    setState(prev => ({
      ...prev,
      sort: { sortBy, sortOrder: sortOrder || (prev.sort.sortBy === sortBy && prev.sort.sortOrder === 'ASC' ? 'DESC' : 'ASC') },
      page: 1,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, [defaultState]);

  return {
    filters: state.filters,
    sort: state.sort,
    page: state.page,
    limit: state.limit,
    setFilters,
    setSort,
    setPage,
    setLimit,
    reset,
    state,
    setState,
  };
}

export function usePersistedFilters<T extends Record<string, any>>(
  routeKey: string,
  defaultFilters: T
) {
  const storageKey = `${STORAGE_PREFIX}${routeKey}:filters`;

  const [filters, setFilters] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultFilters;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return { ...defaultFilters, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn(`[usePersistedFilters] Failed to parse stored filters for ${routeKey}:`, e);
    }
    return defaultFilters;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (e) {
      console.warn(`[usePersistedFilters] Failed to persist filters for ${routeKey}:`, e);
    }
  }, [storageKey, filters]);

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);

  return { filters, setFilters, updateFilter, resetFilters };
}