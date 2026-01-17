// frontend/components/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast'; // For notifications
import api from '../../lib/api'; // Our existing API client

// Import existing shared types
export { Role as RoleEnum } from '@shared/types/role.enum';
export { Role } from '@shared/types/role.enum';
import { UserPayload as BackendUserPayload } from '@shared/types/user'; // Rename to avoid conflict

// Import new frontend-specific types
import { AppUser, AppRole, LoginApiResponse } from '../../types/auth';

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string; // Optional for SuperAdmin login
  rememberMe?: boolean;
}

// Result for login operation, handles MFA state
export interface LoginResult {
  success: boolean;
  requiresMFA?: boolean;
  mfaToken?: string;
  error?: string;
}

// Main authentication state for the context
export interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Initial loading state (e.g., checking token on mount)
  isInitialized: boolean; // NEW: Tracks if auth has completed initial load (crucial for _app.tsx)
  error: string | null;
}

// Public API of the AuthContext
export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
  verifyMFA: (code: string, mfaToken: string) => Promise<LoginResult>; // Placeholder
  refreshAuth: () => Promise<void>;
  hasRole: (role: RoleEnum) => boolean;
  hasAnyRole: (roles: RoleEnum[]) => boolean;
  hasPermission: (permission: string) => boolean;
  getPrimaryRole: () => RoleEnum | null;
  getDefaultRoute: () => string; // Gets user's default landing page based on role hierarchy
}

// ============================================================================
// ROUTE CONFIGURATION - Single Source of Truth
// ============================================================================

// Adapting to existing project routes
export const ROLE_ROUTES: Record<RoleEnum, string> = {
  [RoleEnum.SuperAdmin]: '/super', // As per navigationMap.ts
  [RoleEnum.Admin]: '/dashboard/home',
  [RoleEnum.ITHead]: '/dashboard/home',
  [RoleEnum.Finance]: '/dashboard/home',
  [RoleEnum.OperationalHead]: '/dashboard/home',
  [RoleEnum.CEO]: '/dashboard/home',
  [RoleEnum.AssignedProjectUser]: '/dashboard/home',
  // Assuming a generic 'User' role also defaults to dashboard home if implemented
};

// Expanded public routes
export const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/unauthorized', '/verify-email'];

// ============================================================================
// LOGGING UTILITY - Enhanced
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
// AUTHENTICATION TOKEN & USER STORAGE (ADAPTED)
// Uses localStorage for token, but adapts user storage for new AppUser type
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
// ADAPTER: Backend UserPayload to Frontend AppUser
// ============================================================================

const adaptBackendUserPayloadToAppUser = (payload: BackendUserPayload): AppUser => {
  const roles: AppRole[] = payload.roles.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    // Permissions will be flattened on the user object itself as per current backend
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
    // Flatten permissions directly from payload if available
    permissions: payload.permissions || [],
    impersonatorId: undefined, // Not in current backend UserPayload
  };
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Initially true for token check
    isInitialized: false, // NEW: Becomes true after initial token check
    error: null,
  });

  // Track navigation intent to prevent race conditions
  const navigationIntentRef = useRef<string | null>(null);
  const isNavigatingRef = useRef(false);

  // ============================================================================
  // SAFE STATE UPDATER - Prevents updates after unmount
  // ============================================================================

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((updates: Partial<AuthState>) => {
    if (!isMountedRef.current) {
      AuthLogger.warn('Attempted state update after unmount - ignoring');
      return;
    }
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ============================================================================
  // ROLE & PERMISSION CHECKS
  // ============================================================================

  const hasRole = useCallback((role: RoleEnum): boolean => {
    return state.user?.roles.some(r => r.name === role) ?? false;
  }, [state.user]);

  const hasAnyRole = useCallback((roles: RoleEnum[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const hasPermission = useCallback((permission: string): boolean => {
    // SuperAdmin implicitly has all permissions
    if (state.user?.roles.some(r => r.name === RoleEnum.SuperAdmin)) {
      return true;
    }
    // Check against the flattened permissions list on the user object
    return state.user?.permissions?.includes(permission) ?? false;
  }, [state.user]);

  const getPrimaryRole = useCallback((): RoleEnum | null => {
    if (!state.user?.roles.length) return null;
    
    // Priority order: SuperAdmin > Admin > ITHead > CEO > Finance > OperationalHead > AssignedProjectUser
    const rolePriority = [
      RoleEnum.SuperAdmin,
      RoleEnum.Admin,
      RoleEnum.ITHead,
      RoleEnum.CEO,
      RoleEnum.Finance,
      RoleEnum.OperationalHead,
      RoleEnum.AssignedProjectUser,
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
  // SAFE NAVIGATION HANDLER - Prevents race conditions
  // ============================================================================

  const navigateToRoute = useCallback(async (targetRoute: string, replace = false) => {
    if (isNavigatingRef.current) {
      AuthLogger.warn('Navigation already in progress, skipping duplicate navigation');
      return;
    }

    try {
      isNavigatingRef.current = true;
      navigationIntentRef.current = targetRoute;
      
      AuthLogger.info(`Navigating to: ${targetRoute} (replace: ${replace})`);

      // Use replace for post-login/logout to avoid back button issues
      if (replace) {
        await router.replace(targetRoute);
      } else {
        await router.push(targetRoute);
      }

      AuthLogger.success(`Navigation completed to: ${targetRoute}`);
    } catch (error) {
      AuthLogger.error('Navigation failed', error);
      throw error;
    } finally {
      isNavigatingRef.current = false;
      navigationIntentRef.current = null;
    }
  }, [router]);

  // ============================================================================
  // FETCH CURRENT USER (and adapt to AppUser type)
  // ============================================================================

  const fetchCurrentUser = useCallback(async (): Promise<AppUser | null> => {
    try {
      AuthLogger.info('Fetching current user...');
      const token = AuthStorage.getToken();
      if (!token) {
        AuthLogger.warn('No token found for fetching current user.');
        return null;
      }

      const response = await api.get<{ user: BackendUserPayload }>('/auth/me');
      
      if (response.data?.user) {
        const appUser = adaptBackendUserPayloadToAppUser(response.data.user);
        AuthLogger.success('User fetched and adapted successfully', {
          email: appUser.email,
          roles: appUser.roles.map(r => r.name),
        });
        return appUser;
      }
      
      AuthLogger.warn('No user data in /auth/me response');
      return null;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          AuthLogger.info('User token invalid (401) during fetchCurrentUser');
          AuthStorage.clear(); // Clear invalid token
          return null;
        }
      }
      AuthLogger.error('Error fetching user', error);
      // Re-throw if it's a critical error not related to authentication
      throw error; 
    }
  }, []);

  // ============================================================================
  // INITIALIZE AUTH STATE ON MOUNT (Check existing token)
  // ============================================================================

  useEffect(() => {
    let isCancelled = false;

    const initializeAuth = async () => {
      AuthLogger.info('Initializing auth state...');
      updateState({ isLoading: true }); // Start loading for initialization
      
      try {
        const user = await fetchCurrentUser();

        if (isCancelled) return;

        if (user) {
          AuthStorage.setUser(user); // Store adapted AppUser
          updateState({
            user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        } else {
          // No valid user, clear any stale data
          AuthStorage.clear();
          updateState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
      } catch (error) {
        if (isCancelled) return;
        
        AuthLogger.error('Auth initialization failed', error);
        updateState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initializeAuth();

    return () => {
      isCancelled = true;
    };
  }, [fetchCurrentUser, updateState]);

  // ============================================================================
  // LOGIN FUNCTION - CRITICAL: No immediate navigation from here
  // ============================================================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    AuthLogger.info('Login attempt', { email: credentials.email });
    updateState({ isLoading: true, error: null });

    try {
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

      // Handle MFA requirement - PLACEHOLDER
      if (response.data.requiresMFA && response.data.mfaToken) { // Assuming backend sends these fields
        AuthLogger.info('MFA required - Frontend ready, but backend not yet implemented for MFA');
        updateState({ isLoading: false });
        return {
          success: false,
          requiresMFA: true,
          mfaToken: response.data.mfaToken,
        };
      }

      // Login successful - set token and fetch complete user data
      AuthStorage.setToken(response.data.access_token);
      const user = await fetchCurrentUser(); // Fetch user again to get the full AppUser object

      if (!user) {
        throw new Error('Failed to fetch user data after login');
      }

      // CRITICAL: Update state FIRST, navigation happens AFTER state is stable
      AuthStorage.setUser(user); // Store adapted AppUser
      updateState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      AuthLogger.success('Login successful', {
        email: user.email,
        roles: user.roles.map(r => r.name),
        primaryRole: getPrimaryRole(),
      });

      // CRITICAL: Wait for next tick to ensure state propagation to other components
      // before RouteGuard attempts to redirect.
      await new Promise(resolve => setTimeout(resolve, 0));

      // NOW navigate - RouteGuard will handle the actual routing based on updated state
      const defaultRoute = getDefaultRoute();
      await navigateToRoute(defaultRoute, true); // Use replace to clear login history

      return { success: true };

    } catch (error: unknown) {
      const errorMessage = (error && typeof error === 'object' && 'response' in error)
        ? ((error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message || 'Login failed')
        : 'Login failed';

      // Convert array messages to string if needed
      const finalErrorMessage = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;
      
      AuthLogger.error('Login failed', error);
      updateState({
        isLoading: false,
        error: finalErrorMessage,
      });

      return {
        success: false,
        error: finalErrorMessage,
      };
    }
  }, [fetchCurrentUser, navigateToRoute, updateState, getPrimaryRole, getDefaultRoute]);

  // ============================================================================
  // MFA VERIFICATION - PLACEHOLDER
  // ============================================================================

  const verifyMFA = useCallback(async (code: string, mfaToken: string): Promise<LoginResult> => {
    AuthLogger.warn('MFA verification is a frontend placeholder; backend not yet implemented.');
    toast.error('MFA verification is not yet fully implemented on the backend.');

    // Simulate success/failure based on code for now
    if (code === '123456') {
      // Simulate successful MFA, then fetch user and navigate
      // In a real scenario, backend would return a new token
      AuthLogger.info('MFA placeholder: simulating success');
      const user = await fetchCurrentUser();
      if (user) {
        AuthStorage.setUser(user);
        updateState({ user, isAuthenticated: true, isLoading: false, error: null });
        await new Promise(resolve => setTimeout(resolve, 0));
        await navigateToRoute(getDefaultRoute(), true);
        return { success: true };
      }
    }
    return { success: false, error: 'Invalid MFA code (placeholder)' };
  }, [fetchCurrentUser, navigateToRoute, updateState, getDefaultRoute]);

  // ============================================================================
  // LOGOUT
  // ============================================================================

  const logout = useCallback(async () => {
    AuthLogger.info('Logging out');
    try {
      await api.post('/auth/logout');
    } catch (error) {
      AuthLogger.error('Logout API call failed, but clearing session anyway', error);
    } finally {
      AuthStorage.clear();
      updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      AuthLogger.success('Logout complete');
      await navigateToRoute('/login', true);
    }
  }, [navigateToRoute, updateState]);

  // ============================================================================
  // REFRESH AUTH STATE (e.g., after session timeout extension)
  // ============================================================================

  const refreshAuth = useCallback(async () => {
    try {
      AuthLogger.info('Refreshing auth state');
      const user = await fetchCurrentUser();

      updateState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        error: null,
      });
      AuthLogger.success('Auth state refreshed');
    } catch (error) {
      AuthLogger.error('Failed to refresh auth', error);
      updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to refresh authentication',
      });
    }
  }, [fetchCurrentUser, updateState]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue = useMemo<AuthContextValue>(() => ({
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
  }), [
    state,
    login,
    logout,
    verifyMFA,
    refreshAuth,
    hasRole,
    hasAnyRole,
    hasPermission,
    getPrimaryRole,
    getDefaultRoute,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
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