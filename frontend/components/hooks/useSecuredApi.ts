import { useEffect, useRef, useCallback } from 'react';
import { useAuth, AuthState } from '../context/AuthContext';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import api from '../../lib/api'; // <-- Centralized API instance

interface QueuedRequest {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Custom hook to return the configured Axios instance.
 * It handles 401/403 errors and queues requests until auth is ready.
 */
export const useSecuredApi = (): AxiosInstance => {
  const { logout, authState } = useAuth();
  const requestQueue = useRef<QueuedRequest[]>([]);

  // 1. Queue Interceptor: Pauses requests if auth is hydrating
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      async (config) => {
        // If auth is strictly loading (INITIALIZING or HYDRATING), we queue
        // We do NOT queue if unauthenticated (let it fail) or authenticated (let it pass)
        if (authState === AuthState.INITIALIZING || authState === AuthState.HYDRATING) {
          console.log(`[SECURED API] Auth not ready (${authState}), queuing request: ${config.url}`);
          return new Promise((resolve, reject) => {
            requestQueue.current.push({ config, resolve, reject });
          });
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [authState]);

  // 2. Queue Processor: Flushes queue when auth becomes READY
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED && requestQueue.current.length > 0) {
      console.log(`[SECURED API] Auth ready! Flushing ${requestQueue.current.length} queued requests.`);
      const queue = [...requestQueue.current];
      requestQueue.current = [];

      queue.forEach(({ config, resolve, reject }) => {
        // Re-request using the base axios instance (bypassing the queue interceptor if possible, 
        // or relying on the fact that authState is now AUTHENTICATED)
        api.request(config).then(resolve).catch(reject);
      });
    } else if (authState === AuthState.UNAUTHENTICATED && requestQueue.current.length > 0) {
       // If auth failed, reject all queued requests
       console.warn(`[SECURED API] Auth failed. Rejecting ${requestQueue.current.length} queued requests.`);
       const queue = [...requestQueue.current];
       requestQueue.current = [];
       queue.forEach(({ reject }) => reject(new Error('Authentication failed during initialization')));
    }
  }, [authState]);

  // 3. Response Interceptor: 401/403 handling (Existing logic)
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error(`[SECURED API] ${error.response.status} detected. Logging out.`, error.config?.url);
          logout(); 
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [logout]);

  return api;
};