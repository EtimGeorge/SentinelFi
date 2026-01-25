import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from 'lib/api';
import { Role } from '@shared/types/role.enum';
import AppLoadingFallback from '../common/AppLoadingFallback';
import axios from 'axios';
import { SmartAbortController, globalDeduplicator, authCircuitBreaker } from 'lib/resilience';

export { Role } from '@shared/types/role.enum';

// ============================================================================
// AUTH LOGGER UTILITY
// ============================================================================
export class AuthLogger {
  static info(message: string, context?: any) {
    console.info(`%c[AUTH INFO] ${message}`, 'color: #1E90FF;', context || '');
  }
  static warn(message: string, context?: any) {
    console.warn(`%c[AUTH WARN] ${message}`, 'color: #FFD700;', context || '');
  }
  static error(message: string, error?: any) {
    console.error(`%c[AUTH ERROR] ${message}`, 'color: #FF6347;', error || '');
  }
  static success(message: string, context?: any) {
    console.log(`%c[AUTH SUCCESS] ${message}`, 'color: #32CD32;', context || '');
  }
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SimpleRole {
  id: string;
  name: Role;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  roles: SimpleRole[];
  tenant_id: string | null;
  tenant_name?: string | null;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  impersonator_id?: string | null;
}

// NEW: Auth State Enum
export enum AuthState {
  INITIALIZING = 'INITIALIZING',
  HYDRATING = 'HYDRATING',
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  ERROR = 'ERROR',
}

interface AuthContextType {
  user: User | null;
  authState: AuthState; // Added authState
  isAuthenticated: boolean;
  isInitialized: boolean;
  isInitialLoad: boolean; // FOR BACKWARD COMPATIBILITY
  isLoading: boolean;
  error: Error | null; // NEW: Track auth errors
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (silent?: boolean) => Promise<void>; // Updated signature
  getPrimaryRole: () => Role | null;
  getDefaultRoute: () => string;
  stopImpersonation: () => Promise<void>;
  isImpersonating: boolean;
  isOnline: boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

// ============================================================================
// COLLAPSED UTILITY CLASSES (Consolidated for cleaner Context)
// ============================================================================

class LoginRateLimiter {
  private attempts = new Map<string, number[]>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60000;

  isRateLimited(email: string): boolean {
    const now = Date.now();
    const userAttempts = (this.attempts.get(email) || []).filter(time => now - time < this.windowMs);
    if (userAttempts.length >= this.maxAttempts) return true;
    return false;
  }
  recordAttempt(email: string): void {
    const now = Date.now();
    const userAttempts = (this.attempts.get(email) || []).filter(time => now - time < this.windowMs);
    userAttempts.push(now);
    this.attempts.set(email, userAttempts);
  }
  reset(email: string): void {
    this.attempts.delete(email);
  }
}

// ============================================================================
// SESSION STORAGE - Persist auth state across page reloads
// ============================================================================
class SessionStorage {
  private static readonly SESSION_KEY = 'sentinelfi_auth_user';
  private static readonly TIMESTAMP_KEY = 'sentinelfi_auth_timestamp';
  private static readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  static save(user: User): void {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
      localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
      AuthLogger.info('Session saved to localStorage');
    } catch (error) {
      AuthLogger.warn('Failed to save session to localStorage', error);
    }
  }

  static load(): User | null {
    try {
      const userStr = localStorage.getItem(this.SESSION_KEY);
      const timestampStr = localStorage.getItem(this.TIMESTAMP_KEY);

      if (!userStr || !timestampStr) return null;

      const age = Date.now() - parseInt(timestampStr, 10);
      if (age > this.MAX_AGE_MS) {
        AuthLogger.warn('Cached session expired, clearing');
        this.clear();
        return null;
      }

      const user: User = JSON.parse(userStr);
      AuthLogger.info(`Session loaded from localStorage (age: ${Math.round(age / 1000)}s)`);
      return user;
    } catch (error) {
      AuthLogger.warn('Failed to load session from localStorage', error);
      this.clear();
      return null;
    }
  }

  static clear(): void {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TIMESTAMP_KEY);
    AuthLogger.info('Session cleared from localStorage');
  }
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true); // NEW
  const router = useRouter();
  
  const smartAbortRef = useRef(new SmartAbortController());
  const loginInProgressRef = useRef(false);
  const rateLimiterRef = useRef(new LoginRateLimiter());
  const isMountedRef = useRef(true);

  const getPrimaryRole = useCallback((): Role | null => {
    if (!user || !user.roles || user.roles.length === 0) return null;
    
    const getRoleName = (r: any): string | undefined => {
      return typeof r === 'string' ? r : r?.name;
    }

    // Directly compare with the string literal 'SuperAdmin' to avoid module loading race conditions
    const isSuperAdmin = user.roles.some(r => getRoleName(r) === 'SuperAdmin');

    if (isSuperAdmin) {
      return Role.SuperAdmin;
    }

    return getRoleName(user.roles[0]) as Role;
  }, [user]);

  const hasRole = useCallback((role: Role): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some(r => (typeof r === 'string' ? r : r.name) === role);
  }, [user]);

  const hasAnyRole = useCallback((roles: Role[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // SuperAdmin implicitly has all permissions
    if (hasRole(Role.SuperAdmin)) return true;
    
    // Check permissions from user object if available, otherwise would need to check roles
    // The User type from AuthContext.tsx doesn't have permissions, but let's check roles
    return user.roles.some(role => {
        // This is a bit simplified, but follows the logic that permissions are often handled via roles in this app
        return false; // placeholder if specific permission check is needed
    });
  }, [user, hasRole]);

  const getDefaultRoute = useCallback((): string => {
    const primaryRole = getPrimaryRole();
    if (primaryRole === Role.SuperAdmin) return '/super';
    return '/dashboard/home';
  }, [getPrimaryRole]);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    const cacheKey = 'current-user-fetch';
    
    try {
      return await authCircuitBreaker.execute(async () => {
        return await globalDeduplicator.execute(cacheKey, async () => {
          const signal = smartAbortRef.current.createSignal();
          AuthLogger.info('Fetching current user session...');
          
          try {
            const response = await apiClient.get<{ user: User }>('/auth/me', { signal });
            if (isMountedRef.current) setError(null);
            return response.user;
          } finally {
            smartAbortRef.current.releaseSignal();
          }
        });
      });
    } catch (err: any) {
      if (axios.isCancel(err) || err.name === 'AbortError' || err.name === 'CanceledError') {
        AuthLogger.info('User fetch request aborted (expected during navigation/cleanup).');
        return null;
      }

      AuthLogger.error('Failed to fetch user session:', err);
      if (isMountedRef.current) {
        // Only set error state if it's not a 401 (Unauthorized is a valid state, not a system failure)
        if (!axios.isAxiosError(err) || err.response?.status !== 401) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
      return null;
    }
  }, []);

  // 1. Initial Handshake (Runs once on mount)
  useEffect(() => {
    isMountedRef.current = true;
    AuthLogger.info('AuthProvider mounting...');

    // Try to restore from localStorage first (instant)
    const cachedUser = SessionStorage.load();
    if (cachedUser) {
      setUser(cachedUser);
      setIsInitialized(true);
      AuthLogger.info('Auth hydrated from cache, verifying with backend...');
      
      // Verify in background WITHOUT abort signal (critical for page reload in StrictMode)
      // We want this verification to complete even if component unmounts temporarily
      apiClient.get<{ user: User }>('/auth/me')
        .then(response => {
          if (isMountedRef.current) {
            setUser(response.user);
            SessionStorage.save(response.user);
            AuthLogger.info('Background verification successful, session updated');
          }
        })
        .catch(err => {
          if (axios.isCancel(err)) return; // Ignore cancellations
          
          // Only clear session if it's a real auth failure (401)
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            AuthLogger.warn('Cached session invalid (401), clearing');
            if (isMountedRef.current) {
              setUser(null);
              SessionStorage.clear();
            }
          } else {
            // Network error or other issue - keep cached session
            AuthLogger.warn('Background verification failed but keeping cached session', err.message);
          }
        });
    } else {
      // No cache, fetch from backend
      fetchCurrentUser().then(currentUser => {
        if (isMountedRef.current) {
          setUser(currentUser);
          setIsInitialized(true);
          if (currentUser) {
            SessionStorage.save(currentUser);
          }
          AuthLogger.success('Auth initialization complete.');
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      smartAbortRef.current.releaseSignal();
    };
  }, [fetchCurrentUser]);

  // 2. Connectivity Tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Session Heartbeat (Isolated)
  useEffect(() => {
    if (!user || !isOnline) return;

    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const heartbeatId = setInterval(() => {
      fetchCurrentUser().then(currentUser => {
        if (isMountedRef.current && currentUser === null) {
          AuthLogger.warn('Heartbeat: Session expired or invalid. Clearing state.');
          setUser(null);
          router.push('/login?reason=session_expired');
        }
      });
    }, intervalMs);

    return () => clearInterval(heartbeatId);
  }, [!!user, isOnline, fetchCurrentUser, router]);

  const login = useCallback(async (email: string, password: string, role: Role) => {
    if (loginInProgressRef.current) throw new Error('Login already in progress.');
    if (rateLimiterRef.current.isRateLimited(email)) {
      throw new Error('Too many login attempts. Please try again in a minute.');
    }

    loginInProgressRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = role === Role.SuperAdmin ? '/auth/login/super' : '/auth/login/tenant';
      const response = await apiClient.post<{ user: User }>(endpoint, { email, password });
      
      AuthLogger.success(`Authenticated as ${email}`);
      rateLimiterRef.current.reset(email);
      setUser(response.user);
      SessionStorage.save(response.user); // Persist to localStorage
    } catch (err: any) {
      rateLimiterRef.current.recordAttempt(email);
      if (axios.isCancel(err)) throw err;
      
      const message = err.response?.data?.message || err.message || 'Login failed';
      throw new Error(message);
    } finally {
      loginInProgressRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    AuthLogger.info('Logging out...');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      AuthLogger.warn('Logout API call failed, proceeding with local cleanup.', error);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
      SessionStorage.clear(); // Clear localStorage
      router.push('/login');
    }
  }, [router]);

  const refreshUser = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const currentUser = await fetchCurrentUser();
    if (isMountedRef.current) {
      setUser(currentUser);
      if (!silent) setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const isImpersonating = !!user?.impersonator_id;

  const stopImpersonation = useCallback(async () => {
    AuthLogger.info('Stopping impersonation...');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/impersonate/stop');
      setUser(null);
      await refreshUser();
      router.push('/super');
    } catch (error) {
      AuthLogger.error('Failed to stop impersonation', error);
      await refreshUser();
      router.push('/super');
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser, router]);

  // Determine high-level AuthState
  let authState = AuthState.INITIALIZING;
  if (isInitialized) {
    if (user) authState = AuthState.AUTHENTICATED;
    else authState = AuthState.UNAUTHENTICATED;
  }
  // If we wanted 'HYDRATING', we'd need more granular state, but this covers useSecuredApi needs

  const value: AuthContextType = {
    user,
    authState,
    isAuthenticated: !!user,
    isInitialized,
    isInitialLoad: !isInitialized,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    getPrimaryRole,
    getDefaultRoute,
    stopImpersonation,
    isImpersonating,
    isOnline,
    hasRole,
    hasAnyRole,
    hasPermission,
  };
  
  if (!isInitialized) {
      return <AppLoadingFallback message="Initializing Secure Session..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {!isOnline && (
        <div className="bg-yellow-600 text-white p-2 text-center sticky top-0 z-[10000] flex justify-center items-center gap-2 text-sm font-semibold shadow-md">
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536m0 0l-2.829-2.829m11.314 0a4.5 4.5 0 00-6.364 0" />
          </svg>
          NETWORK OFFLINE: SOME FEATURES MAY BE UNAVAILABLE
        </div>
      )}
      {isImpersonating && (
        <div className="bg-red-600 text-white p-3 text-center sticky top-0 z-[9999] flex justify-between items-center shadow-lg border-b border-red-700">
          <div className="flex-1 text-center font-bold">
            ⚠️ SYSTEM ADVISORY: IMPERSONATING AS {user?.first_name} {user?.last_name} ({user?.email})
          </div>
          <button 
            onClick={() => stopImpersonation()}
            className="bg-white text-red-600 px-4 py-1 rounded-md text-sm font-bold hover:bg-gray-100 transition-colors mr-4 shadow-sm"
          >
            END SESSION
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/_error', '/404', '/500'];

export const ROLE_ROUTES: Record<Role, string[]> = {
  ['SuperAdmin']: ['/super'],
  [Role.Admin]: ['/dashboard', '/admin'],
  [Role.ITHead]: ['/dashboard'],
  [Role.Finance]: ['/dashboard'],
  [Role.OperationalHead]: ['/dashboard'],
  [Role.CEO]: ['/dashboard'],
  [Role.AssignedProjectUser]: ['/dashboard'],
};