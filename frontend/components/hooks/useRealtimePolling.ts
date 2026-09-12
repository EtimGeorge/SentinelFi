import { useEffect, useRef, useState, useCallback } from 'react';

interface RealtimePollingOptions<T> {
  intervalMs: number;
  enabled?: boolean;
  onError?: (err: unknown) => void;
  onData?: (data: T) => void;
}

interface RealtimePollingState<T> {
  data: T | null;
  lastUpdated: Date | null;
  isStale: boolean;
  pollNow: () => Promise<void>;
}

/**
 * Generic polling hook that pauses when the tab is hidden.
 * Uses setTimeout (not setInterval) so overlapping fetches never stack.
 */
export function useRealtimePolling<T>(
  fetchFn: () => Promise<T>,
  { intervalMs, enabled = true, onError, onData }: RealtimePollingOptions<T>
): RealtimePollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const inFlightRef = useRef(false);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const pollNow = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setLastUpdated(new Date());
      setIsStale(false);
      onData?.(result);
    } catch (err) {
      setIsStale(true);
      onError?.(err);
    } finally {
      inFlightRef.current = false;
    }
  }, [onError, onData]);

  useEffect(() => {
    if (!enabled) return;

    pollNow();

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      pollNow();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs, pollNow]);

  return { data, lastUpdated, isStale, pollNow };
}