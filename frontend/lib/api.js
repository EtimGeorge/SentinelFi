"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
// const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
// CRITICAL FIX: Use environment variable for the base URL
var BASE_URL = "/api/v1";
/**
 * Global, unsecured Axios instance.
 * Interceptors for security (token injection, 401 handling) will be added
 * dynamically in the AuthProvider to give them access to the context (token/logout).
 */
var api = axios_1.default.create({
    baseURL: BASE_URL,
    withCredentials: true, // CRITICAL: This ensures cookies (HttpOnly JWT) are sent with every request
    headers: {
        "Content-Type": "application/json",
    },
});
exports.default = api;
