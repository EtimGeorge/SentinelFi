// frontend/components/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api'; // Adjusted import path from '@/lib/api'

// Import existing shared types from project
import { Role } from '@shared/types/role.enum'; // Directly import Role
import { UserPayload as BackendUserPayload } from '@shared/types/user'; // Backend payload
import { AppUser, AppRole, LoginApiResponse } from '../../types/auth'; // Frontend AppUser and AppRole

// ============================================================================
// TYPES & ENUMS (Adjusted to project's existing types)
// ============================================================================


export type Role = AppRole; // Use existing AppRole type

export interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  success: boolean;
  requiresMFA?: boolean;
  mfaToken?: string;
  error?: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
  verifyMFA: (code: string, mfaToken: string) => Promise<LoginResult>;
  refreshAuth: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
  getPrimaryRole: () => Role | null;
  getDefaultRoute: () => string;
}

// ============================================================================
// ROUTE CONFIGURATION (Adjusted to project's existing routes)
// ============================================================================

// Adapting to existing project routes
export const ROLE_ROUTES: Record<Role, string> = {
  [Role.SuperAdmin]: '/super', // As per navigationMap.ts
  [Role.Admin]: '/admin/dashboard', // Assuming general admin dashboard
  [Role.ITHead]: '/dashboard/home',
  [Role.Finance]: '/dashboard/home',
  [Role.OperationalHead]: '/dashboard/home',
  [Role.CEO]: '/dashboard/home',
  [Role.AssignedProjectUser]: '/dashboard/home',
};

// Expanded public routes (as per project's existing definition)
export const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/unauthorized', '/verify-email'];

// ============================================================================
// LOGGING UTILITY (Using project's enhanced logger)
// ============================================================================

export class AuthLogger {
  private static prefix = '[AUTH]';
  
  static info(message: string, data?: unknown) {
    console.log(`${this.prefix} ${message}`, data || '');
  }
  
  static warn(message: string, data?: unknown) {
    console.warn(`${this.prefix} ⚠️ ${message}`, data || '');
  }
  
  static error(message: string, error?: unknown) {
    console.error(`${this.prefix} ❌ ${message}`, error || '');
  }

  static success(message: string, data?: unknown) {
    console.log(`${this.prefix} ✅ ${message}`, data || '');
  }
}

// ============================================================================
// AUTHENTICATION TOKEN & USER STORAGE (Using project's existing storage)
// ============================================================================

const AUTH_TOKEN_KEY = 'sentinelfi_auth_token';
const AUTH_USER_KEY = 'sentinelfi_user_v2'; // New key for the updated AppUser structure

class AuthStorage {
  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    }
    return null;
  }

  static setUser(user: AppUser): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } catch (e) {
        AuthLogger.error('Failed to set user in localStorage', e);
      }
    }
  }

  static getUser(): AppUser | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(AUTH_USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr) as AppUser;
        } catch (e) {
          AuthLogger.error('Failed to parse user from localStorage:', e);
          return null;
        }
      }
    }
    return null;
  }

  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// LOADING FALLBACK COMPONENT (Using project's enhanced component)
// ============================================================================

import AppLoadingFallback from '../common/AppLoadingFallback'; // Use the project's enhanced AppLoadingFallback
import { useStrictModeDebug } from '../../utils/strictModeDebugger'; // Import the Strict Mode Debugger

// ============================================================================
// ADAPTER: Backend UserPayload to Frontend AppUser (Using project's adapter)
// ============================================================================

const adaptBackendUserPayloadToAppUser = (payload: BackendUserPayload): AppUser => {
  const roles: AppRole[] = payload.roles.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: [], // For now, roles from backend don't have nested permissions
  }));

  return {
    id: payload.id,
    email: payload.email,
    name: `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    firstName: payload.first_name,
    lastName: payload.last_name,
    roles: roles,
    isActive: payload.is_active,
    tenantId: payload.tenant_id,
    tenantName: payload.tenant_name,
    permissions: payload.permissions || [],
    impersonatorId: undefined,
  };
};

// ============================================================================
// CRITICAL: ABORT CONTROLLER FOR STRICT MODE
// ============================================================================

// Module-level cache for the initial auth check
// Using Map instead of WeakMap as keys are strings. TTL ensures it's short-lived for Strict Mode only.
const authCache = new Map<string, { user: AppUser | null; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds - only cache during initial mount storms

// ============================================================================
// PROVIDER COMPONENT - STRICT MODE COMPATIBLE
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useStrictModeDebug('AuthProvider'); // Track AuthProvider's lifecycle in Strict Mode
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
    error: null,
  });

  // CRITICAL: Use AbortController for cleanup (Instance-specific as per senior dev's guidance)
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // FETCH CURRENT USER - WITH ABORT SIGNAL AND CACHING
  // ============================================================================

  const fetchCurrentUser = useCallback(async (signal?: AbortSignal): Promise<AppUser | null> => {
    const cacheKey = 'initial_auth';
    const cached = authCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      AuthLogger.info('Using cached auth state');
      return cached.user;
    }

    try {
      AuthLogger.info('Fetching current user...');
      
      // Check for token BEFORE making API call
      // Adapt to project's AuthStorage
      const token = AuthStorage.getToken();
      if (!token) {
        AuthLogger.info('No token found - skipping API call');
        const result = { user: null, timestamp: Date.now() };
        authCache.set(cacheKey, result);
        return null;
      }

      const response = await api.get<{ user: BackendUserPayload }>('/auth/me', {
        signal, // Pass abort signal to API call
      });
      
      if (signal?.aborted) {
        AuthLogger.warn('Fetch aborted');
        return null;
      }
      
      if (response.data?.user) {
        const appUser = adaptBackendUserPayloadToAppUser(response.data.user); // Use project's adapter
        AuthLogger.success('User fetched successfully', {
          email: appUser.email,
          roles: appUser.roles.map((r: AppRole) => r.name), // Use AppRole for mapping
        });
        
        const result = { user: appUser, timestamp: Date.now() }; // Store adapted user
        authCache.set(cacheKey, result);
        return appUser;
      }
      
      const result = { user: null, timestamp: Date.now() };
      authCache.set(cacheKey, result);
      return null;
      
    } catch (error: unknown) {
      if (signal?.aborted) {
        AuthLogger.info('Request aborted during fetch');
        return null;
      }
      
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        AuthLogger.info('Request aborted');
        return null;
      }
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          AuthLogger.info('User not authenticated (401)');
          AuthStorage.clear(); // Clear local storage on 401
          const result = { user: null, timestamp: Date.now() };
          authCache.set(cacheKey, result);
          return null;
        }
      }
      
      AuthLogger.error('Error fetching user', error);
      AuthStorage.clear(); // Clear local storage on other fetch errors as well
      throw error;
    }
  }, []);

  // ============================================================================
  // INITIALIZE AUTH - STRICT MODE SAFE
  // ============================================================================

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController; // Store in ref for external access if needed

    let isSubscribed = true; // Local flag for component subscription status

    const initializeAuth = async () => {
      try {
        AuthLogger.info('Initializing auth state...');
        
        const user = await fetchCurrentUser(abortController.signal);

        if (!abortController.signal.aborted && isSubscribed) {
          setState({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted && isSubscribed) {
          AuthLogger.error('Auth initialization failed', error);
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: 'Failed to initialize authentication',
          });
        }
      }
    };

    initializeAuth();

    return () => {
      AuthLogger.info('Auth initialization cleanup - aborting pending requests');
      isSubscribed = false; // Mark component as unsubscribed
      abortController.abort(); // Abort any ongoing fetch requests
    };
  }, [fetchCurrentUser]);

  // ============================================================================
  // ROLE & PERMISSION CHECKS (Using project's existing logic)
  // ============================================================================

  const hasRole = useCallback((role: Role): boolean => {
    return state.user?.roles.some(r => r.name === role) ?? false;
  }, [state.user]);

  const hasAnyRole = useCallback((roles: Role[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const hasPermission = useCallback((permission: string): boolean => {
    // SuperAdmin implicitly has all permissions
    if (state.user?.roles.some(r => r.name === Role.SuperAdmin)) {
      return true;
    }
    // Check against the flattened permissions list on the user object
    return state.user?.permissions?.includes(permission) ?? false;
  }, [state.user]);

  const getPrimaryRole = useCallback((): Role | null => {
    if (!state.user?.roles.length) return null;
    
    // Priority order: SuperAdmin > Admin > ITHead > CEO > Finance > OperationalHead > AssignedProjectUser
    const rolePriority = [
      Role.SuperAdmin,
      Role.Admin,
      Role.ITHead,
      Role.CEO,
      Role.Finance,
      Role.OperationalHead,
      Role.AssignedProjectUser,
    ];

    for (const role of rolePriority) {
      if (hasRole(role)) return role;
    }

    return state.user.roles[0].name; // Fallback to first role if no priority match
  }, [state.user, hasRole]);

  const getDefaultRoute = useCallback((): string => {
    const primaryRole = getPrimaryRole();
    // Default to root if no primary role found, RouteGuard will handle further
    return primaryRole ? (ROLE_ROUTES[primaryRole] || '/') : '/'; 
  }, [getPrimaryRole]);

  // ============================================================================
  // SAFE NAVIGATION (Using project's existing logic)
  // ============================================================================

  const navigateToRoute = useCallback(async (targetRoute: string, replace = false) => {
    try {
      AuthLogger.info(`Navigating to: ${targetRoute}`);
      
      if (replace) {
        await router.replace(targetRoute);
      } else {
        await router.push(targetRoute);
      }
    } catch (error) {
      AuthLogger.error('Navigation failed', error);
      // Fallback to login if navigation fails
      router.replace('/login');
    }
  }, [router]);

  // ============================================================================
  // LOGIN
  // ============================================================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    try {
      AuthLogger.info('Login attempt', { email: credentials.email });
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Determine endpoint based on tenantId
      const endpoint = credentials.tenantId 
        ? `/auth/login/tenant`
        : `/auth/login/super`;

      const payload = { 
        email: credentials.email, 
        password: credentials.password, 
        rememberMe: credentials.rememberMe,
        ...(credentials.tenantId && { tenantId: credentials.tenantId }) 
      };

      const response = await api.post<LoginApiResponse>(endpoint, payload);

      if (response.data.requiresMFA && response.data.mfaToken) {
        setState(prev => ({ ...prev, isLoading: false }));
        return {
          success: false,
          requiresMFA: true,
          mfaToken: response.data.mfaToken,
        };
      }

      AuthStorage.setToken(response.data.access_token); // Set token via project's AuthStorage
      authCache.clear(); // Clear cache on new login to force fresh fetch

      const user = await fetchCurrentUser(); // Fetch fresh user data using the safe fetcher

      if (!user) {
        throw new Error('Failed to fetch user data after login');
      }

      AuthStorage.setUser(user); // Store adapted user via project's AuthStorage
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });

      AuthLogger.success('Login successful', {
        email: user.email,
        roles: user.roles.map(r => r.name),
      });

      // Navigate after state is stable
      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure state propagation
      const defaultRoute = getDefaultRoute(); // Use project's getDefaultRoute
      await navigateToRoute(defaultRoute, true);

      return { success: true };

    } catch (error: unknown) {
      const errorMessage = (error && typeof error === 'object' && 'response' in error)
        ? ((error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message || 'Login failed')
        : 'Login failed';

      const finalErrorMessage = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;
      
      AuthLogger.error('Login failed', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: finalErrorMessage,
      }));

      return {
        success: false,
        error: finalErrorMessage,
      };
    }
  }, [fetchCurrentUser, navigateToRoute, getDefaultRoute]);

  // ============================================================================
  // MFA VERIFICATION
  // ============================================================================

  const verifyMFA = useCallback(async (code: string, mfaToken: string): Promise<LoginResult> => {
    try {
      AuthLogger.info('Verifying MFA code');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await api.post('/auth/verify-mfa', { code, mfaToken });

      authCache.clear(); // Clear cache after MFA verification
      const user = await fetchCurrentUser();
      
      if (!user) {
        throw new Error('Failed to fetch user after MFA verification');
      }

      AuthStorage.setUser(user); // Store adapted user via project's AuthStorage
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 0));
      const defaultRoute = getDefaultRoute();
      await navigateToRoute(defaultRoute, true);

      return { success: true };

    } catch (error: unknown) {
      const errorMessage = (error && typeof error === 'object' && 'response' in error)
        ? ((error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message || 'MFA verification failed')
        : 'MFA verification failed';

      const finalErrorMessage = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;

      AuthLogger.error('MFA verification failed', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: finalErrorMessage,
      }));

      return {
        success: false,
        error: finalErrorMessage,
      };
    }
  }, [fetchCurrentUser, navigateToRoute, getDefaultRoute]);

  // ============================================================================
  // LOGOUT
  // ============================================================================

  const logout = useCallback(async () => {
    try {
      AuthLogger.info('Logging out');
      await api.post('/auth/logout');
    } catch (error) {
      AuthLogger.error('Logout API call failed', error);
    } finally {
      AuthStorage.clear(); // Clear local storage on logout
      authCache.clear(); // Clear cache on logout
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true, // Mark as initialized to prevent preloader loop
        error: null,
      });
      await navigateToRoute('/login', true);
    }
  }, [navigateToRoute]);

  // ============================================================================
  // REFRESH AUTH
  // ============================================================================

  const refreshAuth = useCallback(async () => {
    try {
      AuthLogger.info('Refreshing auth state');
      authCache.clear(); // Clear cache to force fresh fetch
      const user = await fetchCurrentUser();

      AuthStorage.setUser(user as AppUser); // Store adapted user via project's AuthStorage
      setState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      AuthLogger.error('Failed to refresh auth', error);
      AuthStorage.clear(); // Clear local storage on refresh error
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: 'Failed to refresh authentication',
      });
    }
  }, [fetchCurrentUser]);

  // ============================================================================
  // MEMOIZE CONTEXT VALUE
  // ============================================================================

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      verifyMFA,
      refreshAuth,
      hasRole,
      hasAnyRole,
      hasPermission,
      getPrimaryRole,
      getDefaultRoute,
    }),
    [state, login, logout, verifyMFA, refreshAuth, hasRole, hasAnyRole, hasPermission, getPrimaryRole, getDefaultRoute]
  );

  // ============================================================================
  // RENDER LOADING OR PROVIDER
  // ============================================================================

  if (!state.isInitialized) {
    return <AppLoadingFallback message="Initializing Session..." />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
