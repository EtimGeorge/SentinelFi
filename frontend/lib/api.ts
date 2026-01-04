import axios from "axios";

// CRITICAL FIX: Base URL is now relative, as Next.js will handle proxying via next.config.js rewrites.
const BASE_URL = "/api/v1"; 

/**
 * Global, unsecured Axios instance.
 * Interceptors for security (token injection, 401 handling) will be added
 * dynamically in the AuthProvider to give them access to the context (token/logout).
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // CRITICAL: This ensures cookies (HttpOnly JWT) are sent with every request
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
