import { useAuth } from '../context/AuthContext';
import { AxiosInstance } from 'axios';
import api from '../../lib/api'; // <-- Centralized API instance

/**
 * Custom hook to return the configured Axios instance.
 * It's main role is to handle 401/403 errors by logging out the user.
 */
export const useSecuredApi = (): AxiosInstance => {
  const { logout } = useAuth();

  // CRITICAL: Response interceptor to handle 401/403 errors (Token Expired/Forbidden Role)
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // If the token is invalid, expired, or the user is unauthorized
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Security Breach or Token Expired. Logging out.', error.response);
        logout(); // Automatically log out and redirect to /login
      }
      return Promise.reject(error);
    }
  );

  return api;
};