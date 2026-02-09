import { useMemo, useEffect, useRef } from 'react';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import api from '../../lib/api';

/**
 * Advanced hook to return a secured Axios instance with automatic request cancellation.
 * It manages an Internal AbortController linked to the component lifecycle.
 * Any request initiated via this hook will be automatically cancelled on unmount.
 */
export const useSecuredApi = (): AxiosInstance => {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Ensure we have a fresh, non-aborted controller
  if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
    abortControllerRef.current = new AbortController();
  }

  // Cleanup: Cancel all pending requests when component unmounts
  useEffect(() => {
    return () => {
      // Use the ref directly in cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const securedApi = useMemo(() => {
    // Create a proxy/wrapper around the global api instance
    const instance = api;

    // We'll wrap the common request methods to inject the signal automatically
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'request'] as const;
    
    // Create a specialized instance (or proxy)
    // For simplicity and to avoid complex proxying of Axios, we return the instance 
    // but warn that manual signal passing is still the gold standard, OR
    // we can return a "per-hook" instance.
    
    // Actually, the most robust way is to provide a wrapper that merges signals.
    return new Proxy(instance, {
      get(target, prop: keyof AxiosInstance) {
        const value = target[prop];
        
        if (typeof value === 'function' && methods.includes(prop as any)) {
          return (...args: any[]) => {
            // Identify where the config object is (usually last or second to last)
            let configIndex = -1;
            if (prop === 'get' || prop === 'delete' || prop === 'head' || prop === 'options') {
              configIndex = 1;
            } else if (prop === 'post' || prop === 'put' || prop === 'patch') {
              configIndex = 2;
            } else if (prop === 'request') {
              configIndex = 0;
            }

            // Inject our hook-level signal if not already provided
            if (configIndex !== -1) {
              const config = (args[configIndex] || {}) as AxiosRequestConfig;
              if (!config.signal) {
                config.signal = abortControllerRef.current.signal;
              }
              args[configIndex] = config;
            }

            return value.apply(target, args);
          };
        }
        return value;
      }
    });
  }, []);

  return securedApi as AxiosInstance;
};