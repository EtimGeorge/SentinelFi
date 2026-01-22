// frontend/hooks/useAuthHooks.tsx
import { useAuth, Role, AuthLogger } from '../components/context/AuthContext'; // Using relative path for AuthContext
import { useRouter } from 'next/router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
export { Role } from '../components/context/AuthContext';

// ============================================================================
// ROLE-BASED RENDERING HOOK
// ============================================================================

interface UseRoleGuardOptions {
  requiredRoles?: Role[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  onUnauthorized?: () => void;
  // NEW: Added a flag to indicate if a full check has been completed
  onCheckComplete?: (isAuthorized: boolean) => void;
}

export const useRoleGuard = (options: UseRoleGuardOptions = {}) => {
  const { user, isAuthenticated, hasAnyRole, hasPermission, isInitialized, isLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const { requiredRoles, requiredPermissions, fallbackPath = '/unauthorized', onUnauthorized, onCheckComplete } = options;

  useEffect(() => {
    // Wait for auth to be initialized and user loading to complete
    if (!isInitialized || isLoading) {
      return;
    }

    const checkAuthorization = () => {
      // If not authenticated, and a public route, don't redirect (RouteGuard handles this)
      if (!isAuthenticated || !user) {
        setIsAuthorized(false);
        setIsChecking(false);
        onCheckComplete?.(false);

        // Only redirect if on a protected route and not already being redirected by RouteGuard
        if (!router.pathname.startsWith('/login') && fallbackPath && router.pathname !== fallbackPath) {
          router.replace(fallbackPath);
        }
        onUnauthorized?.();
        return;
      }

      let authorized = true;

      // Check roles
      if (requiredRoles && requiredRoles.length > 0) {
        if (!hasAnyRole(requiredRoles)) {
          authorized = false;
        }
      }

      // Check permissions
      if (authorized && requiredPermissions && requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(perm => 
          hasPermission(perm)
        );
        if (!hasAllPermissions) {
          authorized = false;
        }
      }

      setIsAuthorized(authorized);
      setIsChecking(false);
      onCheckComplete?.(authorized);

      if (!authorized && fallbackPath && router.pathname !== fallbackPath) {
        router.replace(fallbackPath);
        onUnauthorized?.();
      }
    };

    checkAuthorization();
  }, [
    isAuthenticated, 
    user, 
    hasAnyRole, 
    hasPermission, 
    router, 
    requiredRoles, 
    requiredPermissions,
    fallbackPath,
    onUnauthorized,
    onCheckComplete,
    isInitialized,
    isLoading,
  ]);

  return { isAuthorized, isChecking };
};

// ============================================================================
// SESSION TIMEOUT HOOK
// ============================================================================

interface UseSessionTimeoutOptions {
  timeout?: number; // in milliseconds
  warningTime?: number; // show warning before timeout
  onTimeout?: () => void;
  onWarning?: () => void;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const { logout, isAuthenticated } = useAuth();
  const {
    timeout = 30 * 60 * 1000, // 30 minutes default
    warningTime = 5 * 60 * 1000, // 5 minutes warning
    onTimeout,
    onWarning,
  } = options;

  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [isWarningShown, setIsWarningShown] = useState(false);

  // Store timeouts to clear them
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    // Clear any existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    setTimeRemaining(timeout);
    setIsWarningShown(false);

    // Set the main timeout
    timeoutRef.current = setTimeout(() => {
      onTimeout?.();
      logout();
    }, timeout);

    // Set the warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarningShown(true);
      onWarning?.();
    }, timeout - warningTime);

  }, [timeout, warningTime, onTimeout, onWarning, logout]);

  // Activity listeners
  useEffect(() => {
    if (!isAuthenticated) return; // Only track activity if authenticated

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timer on mount if authenticated
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [isAuthenticated, resetTimer]);

  useEffect(() => {
    // This interval is purely for updating the `timeRemaining` display
    let countdownInterval: NodeJS.Timeout;
    if (isWarningShown && isAuthenticated) {
      countdownInterval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isWarningShown, isAuthenticated]);


  return {
    timeRemaining,
    isWarningShown,
    resetTimer,
    formatTime: useCallback(() => {
      const totalSeconds = Math.floor(timeRemaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, [timeRemaining]),
  };
};

// ============================================================================
// PERMISSION-BASED COMPONENT WRAPPER
// ============================================================================

interface RequirePermissionProps {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const { hasPermission, isInitialized, isLoading } = useAuth();
  const [canAccess, setCanAccess] = useState(false);

  if (!isInitialized || isLoading) return null; // Or a loading spinner
  return canAccess ? <React.Fragment>{children}</React.Fragment> : <React.Fragment>{fallback}</React.Fragment>;
};

// ============================================================================
// ROLE-BASED COMPONENT WRAPPER
// ============================================================================

interface RequireRoleProps {
  role: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  role,
  fallback = null,
  children,
}) => {
  const { hasAnyRole, hasRole, isInitialized, isLoading } = useAuth();
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (isInitialized && !isLoading) {
      const rolesToCheck = Array.isArray(role) ? role : [role];
      setCanAccess(hasAnyRole(rolesToCheck));
    }
  }, [role, hasAnyRole, hasRole, isInitialized, isLoading]);


  if (!isInitialized || isLoading) return null; // Or a loading spinner
  return canAccess ? <React.Fragment>{children}</React.Fragment> : <React.Fragment>{fallback}</React.Fragment>;
};

// ============================================================================
// AUTH STATE DEBUGGER HOOK (Development only)
// ============================================================================

export const useAuthDebugger = () => {
  const auth = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔐 Auth State Debug');
      console.log('User:', auth.user?.email);
      console.log('Roles:', auth.user?.roles.map(r => r.name));
      console.log('Is Authenticated:', auth.isAuthenticated);
      console.log('Is Loading:', auth.isLoading);
      console.log('Is Initialized:', auth.isInitialized);
      console.log('Primary Role:', auth.getPrimaryRole());
      console.log('Default Route:', auth.getDefaultRoute());
      console.groupEnd();
    }
  }, [auth]);

  return auth;
};

// ============================================================================
// ACTIVITY LOGGER HOOK
// This can be used to track user activity for session management, analytics, etc.
// Not strictly part of auth, but useful in this context.
// ============================================================================

interface UseActivityLoggerOptions {
  events?: string[];
  throttle?: number;
  onActivity?: (event: string) => void;
}

export const useActivityLogger = (options: UseActivityLoggerOptions = {}) => {
  const { user } = useAuth();
  const {
    events = ['click', 'scroll', 'keypress'],
    throttle = 5000, // default 5 seconds
    onActivity,
  } = options;

  const lastActivityRef = useRef<Date>(new Date());
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logActivity = useCallback((eventType: string) => {
    const now = new Date();
    if (throttleTimerRef.current && (now.getTime() - lastActivityRef.current.getTime() < throttle)) {
      return; // Too frequent, throttled
    }

    lastActivityRef.current = now;
    onActivity?.(eventType);

    // Optional: Send to analytics/monitoring service
    if (user) {
      AuthLogger.info(`[Activity] User ${user.email} - ${eventType}`);
    }

    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
    }, throttle);
  }, [onActivity, user, throttle]);

  useEffect(() => {
    const handlers = events.map(event => {
      const handler = () => logActivity(event);
      document.addEventListener(event, handler);
      return { event, handler };
    });

    return () => {
      handlers.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler);
      });
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, [events, logActivity]);

  return { lastActivity: lastActivityRef.current };
};