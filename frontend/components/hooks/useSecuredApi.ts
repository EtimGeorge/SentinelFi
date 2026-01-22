import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AxiosInstance } from 'axios';
import api from '../../lib/api'; // <-- Centralized API instance

/**
 * Custom hook to return the configured Axios instance.
 * It handles 401/403 errors by logging out the user.
 */
export const useSecuredApi = (): AxiosInstance => {
  const { logout } = useAuth();

  useEffect(() => {
    // CRITICAL: Response interceptor to handle 401/403 errors (Token Expired/Forbidden Role)
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // 401: Unauthorized (Token expired or missing)
        // 403: Forbidden (Role mismatch)
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error(`[SECURED API] ${error.response.status} detected. Logging out.`, error.config?.url);
          logout(); 
        }
        return Promise.reject(error);
      }
    );

    // Cleanup: Eject the interceptor when the component unmounts to prevent stacking
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  return api;
};