"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSecuredApi = void 0;
var AuthContext_1 = require("../context/AuthContext");
var api_1 = require("../../lib/api"); // <-- Centralized API instance
/**
 * Custom hook to return the configured Axios instance.
 * It's main role is to handle 401/403 errors by logging out the user.
 */
var useSecuredApi = function () {
    var logout = (0, AuthContext_1.useAuth)().logout;
    // CRITICAL: Response interceptor to handle 401/403 errors (Token Expired/Forbidden Role)
    api_1.default.interceptors.response.use(function (response) { return response; }, function (error) {
        var _a, _b;
        // If the token is invalid, expired, or the user is unauthorized
        if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401 || ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 403) {
            console.error('Security Breach or Token Expired. Logging out.', error.response);
            logout(); // Automatically log out and redirect to /login
        }
        return Promise.reject(error);
    });
    return api_1.default;
};
exports.useSecuredApi = useSecuredApi;
