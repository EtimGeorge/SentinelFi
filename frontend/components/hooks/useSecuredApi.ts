import { useMemo } from 'react';
import { AxiosInstance } from 'axios';
import api from '../../lib/api';

/**
 * Hook to return a secured Axios instance for authenticated API calls.
 * 
 * IMPORTANT: This hook previously injected an AbortController that automatically
 * cancelled all in-flight requests on component unmount. This caused systemic
 * "CanceledError" failures because:
 * 
 * 1. SecuredLayout re-renders during auth state transitions (login, token refresh)
 * 2. Re-renders unmount child pages momentarily
 * 3. The unmount cleanup aborted ALL pending API requests
 * 4. Pages would show "Failed to fetch: canceled" errors
 * 
 * The global `api` instance in lib/api.ts already provides:
 * - Request deduplication (prevents duplicate GET calls)
 * - Retry logic with exponential backoff
 * - Circuit breaker protection
 * - Correlation ID tracing
 * 
 * Automatic request cancellation on unmount is therefore removed.
 * If a specific component needs cancellation (e.g., search-as-you-type),
 * it should manage its own AbortController locally.
 */
export const useSecuredApi = (): AxiosInstance => {
  return useMemo(() => api, []);
};