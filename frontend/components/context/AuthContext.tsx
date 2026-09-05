import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  username?: string;
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
  AUTHENTICATED = 'AUTHENTICATED',
  SYNCING = 'SYNCING', // Verified session but re-checking in background
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
  isSyncing: boolean; // NEW: Background verification status
  error: Error | null;
  login: (uid: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (silent?: boolean) => Promise<void>; 
  updateProfile: (data: Partial<User>) => Promise<void>; // NEW: Profile update
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

  isRateLimited(uid: string): boolean {
    const now = Date.now();
    const userAttempts = (this.attempts.get(uid) || []).filter(time => now - time < this.windowMs);
    if (userAttempts.length >= this.maxAttempts) return true;
    return false;
  }
  recordAttempt(uid: string): void {
    const now = Date.now();
    const userAttempts = (this.attempts.get(uid) || []).filter(time => now - time < this.windowMs);
    userAttempts.push(now);
    this.attempts.set(uid, userAttempts);
  }
  reset(uid: string): void {
    this.attempts.delete(uid);
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
      if (!user) {
        AuthLogger.warn('Session save skipped: user is null/undefined');
        return;
      }
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

      if (!userStr || userStr === 'undefined' || !timestampStr) return null;

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();

  const smartAbortRef = useRef(new SmartAbortController());
  const loginInProgressRef = useRef(false);
  const logoutInProgressRef = useRef(false); // NEW: Prevent logout loops
  const rateLimiterRef = useRef(new LoginRateLimiter());
  const authStateRef = useRef<AuthState>(AuthState.INITIALIZING);
  const logoutRef = useRef<() => Promise<void>>();
  const routerRef = useRef(router);
  const isMountedRef = useRef(true);
  const requestQueue = useRef<any[]>([]);


  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // 1.1 CRITICAL FIX: Synchronously update authStateRef when auth state changes
  // Using useEffect instead of useMemo ensures immediate, synchronous updates
  // preventing the race condition where isInitialized=true but authStateRef=INITIALIZING
  useEffect(() => {
    if (!isInitialized) {
      authStateRef.current = AuthState.INITIALIZING;
    } else if (!user) {
      authStateRef.current = AuthState.UNAUTHENTICATED;
    } else {
      authStateRef.current = isSyncing ? AuthState.SYNCING : AuthState.AUTHENTICATED;
    }
  }, [isInitialized, user, isSyncing]);



  // 1. Core Functions (useCallback) - Defined FIRST to avoid ReferenceErrors

  const getPrimaryRole = useCallback((): Role | null => {
    if (!user || !user.roles || user.roles.length === 0) return null;
    const getRoleName = (r: any): string | undefined => typeof r === 'string' ? r : r?.name;
    if (user.roles.some(r => getRoleName(r) === 'SuperAdmin')) return Role.SuperAdmin;
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
    if (hasRole(Role.SuperAdmin)) return true;
    return false;
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
            const response = await apiClient.get<User>('/auth/me', { signal });
            if (isMountedRef.current) setError(null);
            return response;
          } finally {
            smartAbortRef.current.releaseSignal();
          }
        });
      });
    } catch (err: any) {
      if (axios.isCancel(err) || err.name === 'AbortError' || err.name === 'CanceledError') {
        AuthLogger.info('User fetch request aborted.');
        return null;
      }
      AuthLogger.error('Failed to fetch user session:', err);
      if (isMountedRef.current) {
        if (!axios.isAxiosError(err) || err.response?.status !== 401) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
      return null;
    }
  }, []);

  const login = useCallback(async (uid: string, password: string, role: Role, tenantId?: string) => {
    if (loginInProgressRef.current) throw new Error('Login already in progress.');
    if (rateLimiterRef.current.isRateLimited(uid)) {
      throw new Error('Too many login attempts.');
    }
    loginInProgressRef.current = true;
    setIsLoading(true);
    setError(null);
    authCircuitBreaker.reset(); // RESET circuit breaker on login attempt
    try {
      const endpoint = role === Role.SuperAdmin ? '/auth/login/super' : '/auth/login/tenant';
      const payload: any = { email: uid, password };
      if (role !== Role.SuperAdmin && tenantId?.trim()) payload.tenantId = tenantId.trim();
      const raw = await apiClient.post<any>(endpoint, payload);
      // Backend sends { success, user, message } - handle both wrapped and direct shapes
      const returnedUser = (raw as any)?.user ?? (raw as any)?.data?.user ?? raw;
      AuthLogger.success(`Authenticated as ${uid} - response keys: ${Object.keys(raw || {}).join(',')}`);
      if (!returnedUser || !returnedUser.id) {
        AuthLogger.warn(`Login response missing user - raw: ${JSON.stringify(raw).slice(0,300)}`);
      }
      rateLimiterRef.current.reset(uid);
      const userToSave = returnedUser?.user ? returnedUser.user : returnedUser;
      // Ensure we have an id
      if (!userToSave?.id) {
        throw new Error('Login succeeded but no user returned');
      }
      setUser(userToSave as User);
      SessionStorage.save(userToSave as User);

      // BROADCAST: Notify other tabs of successful login
      try {
        const channel = new BroadcastChannel('sentinelfi_auth_sync');
        channel.postMessage({ type: 'LOGIN', user: userToSave });
        channel.close();
      } catch (e) {
        // Fallback for environments without BroadcastChannel
        AuthLogger.warn('BroadcastChannel not supported for sync');
      }
    } catch (err: any) {
      rateLimiterRef.current.recordAttempt(uid);
      const message = err.response?.data?.message || err.message || 'Login failed';
      throw new Error(message);
    } finally {
      loginInProgressRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (logoutInProgressRef.current) return; // Prevent loop
    logoutInProgressRef.current = true;
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
      SessionStorage.clear();

      // BROADCAST: Notify other tabs of logout
      try {
        const channel = new BroadcastChannel('sentinelfi_auth_sync');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      } catch (e) {
        // Graceful degradation
        AuthLogger.warn('BroadcastChannel not supported for sync, performing local logout actions.');
        // If BroadcastChannel fails, ensure local cleanup and redirect still happen
        setIsLoading(false);
        SessionStorage.clear();
        logoutInProgressRef.current = false;
        routerRef.current.push('/login');
        return; // Exit to prevent double execution of cleanup below
      }

      // These actions should always happen after logout, regardless of BroadcastChannel success
      setIsLoading(false);
      SessionStorage.clear();
      logoutInProgressRef.current = false;
      routerRef.current.push('/login');
    }
  }, []);

  // Update logoutRef whenever logout changes
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);


  const refreshUser = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    authCircuitBreaker.reset(); // Reset circuit on manual/explicit refresh
    const currentUser = await fetchCurrentUser();
    if (isMountedRef.current) {
      setUser(currentUser);
      if (!silent) setIsLoading(false);
    }
  }, [fetchCurrentUser]);

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

  const updateProfile = useCallback(async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      const response = await apiClient.patch<User>('/auth/profile', data);
      setUser(response);
      SessionStorage.save(response);
      AuthLogger.success('Profile updated successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Profile update failed';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isImpersonating = !!user?.impersonator_id;

  // 2. Effects Hooks - Defined AFTER callbacks they depend on

  // Initial Handshake
  useEffect(() => {
    isMountedRef.current = true;
    const cachedUser = SessionStorage.load();

    if (cachedUser) {
      // NON-BLOCKING HYDRATION: Trust cache initially
      setUser(cachedUser);
      setIsInitialized(true);
      setIsSyncing(true); // Verifying in background

      apiClient.get<User>('/auth/me')
        .then(response => {
          if (isMountedRef.current) {
            setUser(response);
            SessionStorage.save(response);
            setIsSyncing(false);
            AuthLogger.success('Background verification complete: Session valid.');
          }
        })
        .catch(err => {
          if (axios.isCancel(err)) return;
          AuthLogger.warn('Background verification failed.', err.message);
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            if (isMountedRef.current) {
              setUser(null);
              SessionStorage.clear();
              // REDIRECT REMOVED: Managed by RouteGuard
            }
          }
          if (isMountedRef.current) setIsSyncing(false);
        });

    } else {
      setIsLoading(true);
      fetchCurrentUser().then(currentUser => {
        if (isMountedRef.current) {
          setUser(currentUser);
          setIsInitialized(true);
          setIsLoading(false);
          if (currentUser) {
            SessionStorage.save(currentUser);
            authCircuitBreaker.reset(); // Success resets circuit
          }
        }
      }).catch(() => {
        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      });
    }
    return () => { isMountedRef.current = false; };
  }, [fetchCurrentUser]);

  // Connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync: Multi-Tab Synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('sentinelfi_auth_sync');
    } catch (e) {
      // Graceful degradation for environments without BroadcastChannel
      return;
    }

    channel.onmessage = (event) => {
      if (!isMountedRef.current) return;

      const type = event.data?.type;

      AuthLogger.info(`[SYNC] Received ${type} from another tab`);

      if (type === 'LOGOUT') {
        // Another tab logged out -> We must logout too
        if (user) {
          AuthLogger.warn('[SYNC] Session terminated in another tab. Logging out locally.');
          setUser(null);
          SessionStorage.clear();
          // REDIRECT REMOVED: Managed by RouteGuard
        }
      } else if (type === 'LOGIN') {
        const newUser = event.data.user;
        if (!newUser) return;
        // Another tab logged in
        // If we are unauthenticated OR have a different user ID, we MUST sync
        if (!user || user.id !== newUser.id) {
          AuthLogger.success(`[SYNC] Login detected for ${newUser?.email}. Syncing session.`);

          setUser(newUser);
          SessionStorage.save(newUser);

          // SYNC: Let RouteGuard handle navigation to avoid double-push race
          // (RouteGuard already redirects from /login when isAuthenticated becomes true).
          // We only sync state here; other tabs' RouteGuard will also redirect.
          AuthLogger.info(`[SYNC] State synced for ${newUser?.email}, RouteGuard will redirect`);
        }
      }
    };

    // Fallback: Listen for localStorage changes (for older browsers / edge cases)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sentinelfi_auth_user') {
        if (e.newValue === null && user) {
          setUser(null);
          // REDIRECT REMOVED: Managed by RouteGuard
        }
        // Note: Logic to picking up login from storage is complex due to JSON parsing, 
        // BroadcastChannel is preferred for Login sync.
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, router]);

  // 2.3 Permanent Interceptors (Installed once, dynamic via Refs)
  // Module-level guard to suppress StrictMode double-mount spam in dev (logs twice otherwise)
  const interceptorsInstalledRef = useRef(false);
  useEffect(() => {
    if (interceptorsInstalledRef.current) return;
    interceptorsInstalledRef.current = true;
    // Only log at debug level to avoid console flood on HMR/StrictMode (was info -> caused duplicate lines)
    AuthLogger.info('Initializing permanent API interceptors...');

    const requestInterceptor = apiClient.getAxiosInstance().interceptors.request.use(
      async (config) => {
        // Consult Ref for current state to avoid reconstruction churn
        const state = authStateRef.current;

        // FIX: Only queue requests if BOTH conditions are true:
        // 1. We're still initializing AND
        // 2. We have no user (prevents blocking when cached session exists)
        if (state === AuthState.INITIALIZING && !user) {
          return new Promise((resolve, reject) => {
            const queueItem = { config, resolve, reject };
            requestQueue.current.push(queueItem);

            // FIX: Add timeout protection to prevent indefinite queueing
            // Auto-reject after 10 seconds if still queued
            setTimeout(() => {
              const index = requestQueue.current.findIndex(
                item => item.config === config
              );
              if (index !== -1) {
                requestQueue.current.splice(index, 1);
                reject(new Error('Request queue timeout - auth initialization took too long'));
                AuthLogger.warn('[Request Queue] Timeout: Request rejected after 10s');
              }
            }, 10000);
          });
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = apiClient.getAxiosInstance().interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !logoutInProgressRef.current) {
          AuthLogger.warn('[SECURED API] 401 Unauthorized detected. Executing logout.');
          if (logoutRef.current) logoutRef.current().catch(() => { });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // Keep installed flag true across StrictMode's simulated unmount so second mount doesn't re-add
      // Only actually eject on real unmount (page unload). Suppress log.
      // apiClient.getAxiosInstance().interceptors.request.eject(requestInterceptor);
      // apiClient.getAxiosInstance().interceptors.response.eject(responseInterceptor);
    };
  }, []); // ZERO DEPENDENCIES: Install once per app lifecycle

  // 2.4 Queue Management Effect (Decoupled from interceptor lifecycle)
  useEffect(() => {
    const state = authStateRef.current;

    if (state === AuthState.AUTHENTICATED && requestQueue.current.length > 0) {
      AuthLogger.info(`Flushing ${requestQueue.current.length} queued requests...`);
      const queue = [...requestQueue.current];
      requestQueue.current = [];
      queue.forEach(({ config, resolve, reject }) => {
        apiClient.getAxiosInstance().request(config).then(resolve).catch(reject);
      });
    } else if (state === AuthState.UNAUTHENTICATED && requestQueue.current.length > 0) {
      AuthLogger.warn(`Clearing ${requestQueue.current.length} queued requests as user is unauthenticated.`);
      requestQueue.current.forEach(({ reject }) => reject(new Error('Unauthenticated')));
      requestQueue.current = [];
    }
  }, [user, isInitialized, isSyncing]);



  // Heartbeat
  useEffect(() => {
    if (!user || !isOnline || isSyncing) return;
    const intervalMs = 5 * 60 * 1000;
    const heartbeatId = setInterval(() => {
      fetchCurrentUser().then(currentUser => {
        if (isMountedRef.current && currentUser === null) {
          setUser(null);
          // REDIRECT REMOVED: Managed by RouteGuard
        }
      });
    }, intervalMs);
    return () => clearInterval(heartbeatId);
  }, [!!user, isOnline, isSyncing, fetchCurrentUser, router]);

  // 3. Render

  const value: AuthContextType = useMemo(() => {
    // Determine high-level AuthState for memoized object
    let currentAuthState = AuthState.INITIALIZING;
    if (isInitialized) {
      if (user) {
        currentAuthState = isSyncing ? AuthState.SYNCING : AuthState.AUTHENTICATED;
      } else {
        currentAuthState = AuthState.UNAUTHENTICATED;
      }
    }

    return {
      user,
      authState: currentAuthState,
      isAuthenticated: !!user,
      isInitialized,
      isInitialLoad: !isInitialized,
      isLoading,
      isSyncing,
      error,
      login,
      logout,
      refreshUser,
      updateProfile, // Exposed here
      getPrimaryRole,
      getDefaultRoute,
      stopImpersonation,
      isImpersonating,
      isOnline,
      hasRole,
      hasAnyRole,
      hasPermission,
    };
  }, [
    user, isInitialized, isSyncing, isLoading, error, isOnline,
    login, logout, refreshUser, getPrimaryRole, getDefaultRoute,
    stopImpersonation, isImpersonating, hasRole, hasAnyRole, hasPermission
  ]);


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
      {/* BACKGROUND SYNC INDICATOR */}
      {isSyncing && (
        <div className="fixed bottom-4 right-4 z-[10000] flex items-center gap-2 bg-brand-dark/80 backdrop-blur-sm border border-brand-primary/30 text-brand-primary px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
          <span>SYNCING SESSION...</span>
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

export const PUBLIC_ROUTES = [
  '/', 
  '/login', 
  '/register', 
  '/forgot-password', 
  '/reset-password', 
  '/about', 
  '/training', 
  '/contact', 
  '/_error', 
  '/404', 
  '/500', 
  '/landing/(.*)',
  '/auth/accept-invitation',
  '/auth/setup',
  '/auth/check-email',
  '/billing/success',
  '/legal/terms',
  '/legal/privacy',
  '/landing/testimonials'
];

export const ROLE_ROUTES: Record<Role, string[]> = {
  [Role.SuperAdmin]: ['/super'],
  [Role.CEO]: ['/dashboard'],
  [Role.CFO]: ['/dashboard'],
  [Role.AdminDirector]: ['/dashboard', '/admin'],
  [Role.OperationalDirector]: ['/dashboard'],
  [Role.TechnicalDirector]: ['/dashboard'],
  [Role.FinanceManager]: ['/dashboard'],
  [Role.AdminManager]: ['/dashboard', '/admin'],
  [Role.ProjectManager]: ['/dashboard'],
  [Role.FinanceOfficer]: ['/dashboard'],
  [Role.AdminOfficer]: ['/dashboard'],
  [Role.AssignedProjectUser]: ['/dashboard'],
};