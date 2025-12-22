import axios from "axios";

// const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// CRITICAL FIX: Use environment variable for the base URL
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
