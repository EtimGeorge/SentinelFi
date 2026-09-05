// frontend/components/guards/RouteGuard.tsx
import { useRouter } from 'next/router';
import { useAuth, Role, PUBLIC_ROUTES, ROLE_ROUTES, AuthLogger } from '../context/AuthContext';
import React, { useEffect, useState, useRef, useMemo } from 'react';

// ============================================================================
// SYSTEM ERROR COMPONENT (NEW)
// Displayed when the auth handshake fails due to network/system errors
// ============================================================================

const AuthErrorScreen = ({ error, onRetry }: { error: Error; onRetry: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark text-gray-300">
      <div className="text-center space-y-6 px-4 max-w-md">
        <div className="w-20 h-20 mx-auto bg-red-900/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            Connection Interrupted
          </h2>
          <p className="text-gray-400">
            {error.message || 'We encountered a problem while verifying your session. The auth service might be temporarily unavailable.'}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Attempt Reconnection
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2 px-6 rounded-lg transition-all"
          >
            Refresh Application
          </button>
        </div>

        <p className="text-xs text-gray-500 font-mono pt-4 italic">
          SentinelFi Resilience Protocol Active
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// ENHANCED LOADING COMPONENT
// ============================================================================

const AuthLoadingScreen = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark text-gray-300">
      <div className="text-center space-y-6 px-4">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-2 bg-brand-primary rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            Verifying Access
          </h2>
          <p className="text-gray-400 font-mono">
            Authenticating session{dots.padEnd(3, '\u00A0')}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Please wait</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ROUTE GUARD COMPONENT
// ============================================================================

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading, // Global auth loading state
    error,
    refreshUser,
    getDefaultRoute
  } = useAuth();

  const [authorized, setAuthorized] = useState(isAuthenticated); // Initialize based on current auth status

  // OPTIMIZATION: Determine if we really need to show the full screen loading
  const isPublicRoute = useMemo(() => {
    const cleanPath = router.pathname.split('?')[0];
    return PUBLIC_ROUTES.some(route => {
      if (route.includes('(') || route.includes('*')) {
        const regex = new RegExp(`^${route}$`);
        return regex.test(cleanPath);
      }
      return route === cleanPath;
    });
  }, [router.pathname]);
  const needsAuth = !isPublicRoute;

  useEffect(() => {
    // Determine if we should show the loading screen during transition
    // We only reset 'authorized' if we're not authenticated yet (initial load)
    // or if we're navigating between radically different route types.
    // STABILIZATION: Only reset authorized if we are strictly transitioning to a private route
    // This prevents "Login flicker" on public page transitions
    if (!isAuthenticated && needsAuth) {
      AuthLogger.info(`[RouteGuard] Resetting authorized for private route: ${router.pathname}`);
      setAuthorized(false);
    }

    // If auth is strictly INITIALIZING (not hydrating), do nothing.
    // If it's hydrating, we let it through because isAuthenticated is true (if cached).
    if (isLoading && !isAuthenticated) return;

    if (error) return;

    const checkAuthorization = async () => {
      const currentPath = router.pathname;

      // 1. Public Routes (Enhanced with Regex Support)
      const isPublic = PUBLIC_ROUTES.some(route => {
        if (route.includes('(') || route.includes('*')) {
          const regex = new RegExp(`^${route}$`);
          return regex.test(currentPath);
        }
        return route === currentPath;
      });

      if (isPublic) {
        if (isAuthenticated && user) {
          // If logged in and on auth pages, redirect to their intended route
          if (['/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath)) {
            const returnUrl = typeof router.query.returnUrl === 'string'
              ? router.query.returnUrl
              : undefined;
            // Only honor a safe returnUrl (never redirect to an auth page or an
            // empty/relative-external target) to avoid redirect loops.
            const isSafeReturn = returnUrl &&
              returnUrl.startsWith('/') &&
              !returnUrl.startsWith('//') &&
              !['/login', '/register', '/forgot-password', '/reset-password'].includes(returnUrl);
            await router.replace(isSafeReturn ? returnUrl : getDefaultRoute());
            return;
          }
        }
        setAuthorized(true);
        return;
      }

      // 2. Protected Routes - Check Auth
      if (!isAuthenticated || !user) {
        // Not authenticated, redirect to login
        AuthLogger.warn(`[RouteGuard] Access denied to ${currentPath}, redirecting to login`);
        
        // Final sanity check: Is it TRULY private?
        const doubleCheckPublic = PUBLIC_ROUTES.some(route => {
          if (route.includes('(') || route.includes('*')) {
            return new RegExp(`^${route}$`).test(currentPath);
          }
          return route === currentPath;
        });

        if (doubleCheckPublic) {
          AuthLogger.info(`[RouteGuard] Sanity check passed: ${currentPath} is public. Aborting redirect.`);
          setAuthorized(true);
          return;
        }

        await router.replace({
          pathname: '/login',
          query: { returnUrl: router.asPath },
        });
        return;
      }

      // 3. Role-Based Access Control (Synchronous) — FIX P0-01: enforce tenant vs super boundaries
      const getRoleName = (r: any): string | undefined => {
        return typeof r === 'string' ? r : r?.name;
      };

      const hasSuperAdminRole = user.roles.some(r => getRoleName(r) === 'SuperAdmin');
      const isAdminDirector = user.roles.some(r => getRoleName(r) === Role.AdminDirector);

      // SuperAdmin-only routes
      if (currentPath.startsWith('/super')) {
        if (!hasSuperAdminRole) {
          AuthLogger.warn(`[RouteGuard] Non-SuperAdmin blocked from ${currentPath}`);
          await router.replace(getDefaultRoute());
          return;
        }
        setAuthorized(true);
        return;
      }

      // Tenant-admin routes
      if (currentPath.startsWith('/admin') && !hasSuperAdminRole && !isAdminDirector) {
        AuthLogger.warn(`[RouteGuard] Non-AdminDirector blocked from ${currentPath}`);
        await router.replace(getDefaultRoute());
        return;
      }

      // Access Granted
      setAuthorized(true);
    };

    checkAuthorization();

  }, [router.pathname, isAuthenticated, user, isLoading, error, getDefaultRoute]); // minimized dependencies

  // Handle system-level authentication errors (Only for protected routes)
  if (error && needsAuth) {
    return <AuthErrorScreen error={error} onRetry={refreshUser} />;
  }

  // Show loading screen if:
  // 1. We are on a protected route AND 
  // 2. We are NOT authenticated OR are still in the absolute INITIAL load (isLoading)
  if (needsAuth && (!isAuthenticated || (isLoading && !authorized))) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
};

export default RouteGuard;