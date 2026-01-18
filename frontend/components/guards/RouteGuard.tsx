// frontend/components/guards/RouteGuard.tsx
import { useRouter } from 'next/router';
import { useAuth, RoleEnum, PUBLIC_ROUTES, ROLE_ROUTES, AuthLogger } from '../context/AuthContext'; // Using relative path for now, will adjust to @ later
import React, { useEffect, useState, useRef } from 'react';

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
        {/* Animated Logo/Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-2 bg-brand-primary rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            Verifying Access
          </h2>
          <p className="text-gray-400 font-mono">
            Authenticating session{dots.padEnd(3, '\u00A0')}
          </p>
        </div>

        {/* Status Indicators */}
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
    isLoading, 
    getPrimaryRole,
    getDefaultRoute 
  } = useAuth();

  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const checkInProgressRef = useRef(false);

  // ============================================================================
  // ROUTE AUTHORIZATION LOGIC
  // ============================================================================

  useEffect(() => {
    // Only run if not already checking, and router is ready
    if (checkInProgressRef.current || !router.isReady) {
      AuthLogger.info('[RouteGuard] Waiting for router readiness, or check in progress.', {
        checkInProgress: checkInProgressRef.current,
        routerReady: router.isReady,
      });
      return;
    }

    const checkAuthorization = async () => {
      checkInProgressRef.current = true;
      setIsAuthorizing(true); // Indicate that authorization is in progress
      
      try {
        const currentPath = router.pathname;
        AuthLogger.info('[RouteGuard] Checking authorization for:', currentPath);

        // ========================================================================
        // 1. PUBLIC ROUTES - Always allow, but redirect authenticated users from login/register
        // ========================================================================
        if (PUBLIC_ROUTES.includes(currentPath)) {
          AuthLogger.info('[RouteGuard] Public route - allowing access');
          
          // If authenticated user tries to access login/register, redirect to their default dashboard
          if (isAuthenticated && user) {
            const defaultRoute = getDefaultRoute();
            if (currentPath === '/login' || currentPath === '/register' || currentPath === '/forgot-password' || currentPath === '/reset-password') {
                AuthLogger.info('[RouteGuard] Authenticated user on public auth page - redirecting to:', defaultRoute);
                await router.replace(defaultRoute);
                return; // Prevent further execution as redirect is happening
            }
          }
          
          setIsAuthorizing(false);
          return; // Allow public access
        }

        // ========================================================================
        // 2. UNAUTHENTICATED USERS - Redirect to login for protected routes
        // ========================================================================
        if (!isAuthenticated || !user) {
          AuthLogger.info('[RouteGuard] Unauthenticated access to protected route - redirecting to login');
          await router.replace({
            pathname: '/login',
            query: { returnUrl: router.asPath },
          });
          return;
        }

        // ========================================================================
        // 3. AUTHENTICATED USERS - Check role-based access for protected routes
        // ========================================================================
        const primaryRole = getPrimaryRole();
        
        if (!primaryRole) {
          AuthLogger.error('[RouteGuard] User has no roles - access denied, redirecting to login');
          await router.replace('/login');
          return;
        }

        AuthLogger.info('[RouteGuard] User authenticated', {
          email: user.email,
          primaryRole,
          currentPath,
          roles: user.roles.map(r => r.name),
        });

        // Determine if user has SuperAdmin role (can access all, but we manage tenant routes explicitly)
        const hasSuperAdminRole = user.roles.some(r => r.name === RoleEnum.SuperAdmin);
        
        // Define route prefixes for different role areas
        const isSuperAdminArea = currentPath.startsWith('/super'); // Our project uses /super
        const isAdminArea = currentPath.startsWith('/admin');
        const isDashboardArea = currentPath.startsWith('/dashboard') || currentPath === '/'; // Generic user dashboard area

        // SuperAdmin can access all areas
        if (hasSuperAdminRole) {
          AuthLogger.info('[RouteGuard] SuperAdmin access - allowing all routes');
          
          // Handle root path for SuperAdmin
          if (currentPath === '/') {
            const defaultRoute = getDefaultRoute(); // Should be /super
            AuthLogger.info('[RouteGuard] Root path accessed by SuperAdmin - redirecting to:', defaultRoute);
            await router.replace(defaultRoute);
            return;
          }
          setIsAuthorizing(false);
          return;
        }

        // --- Non-SuperAdmin Role Checks ---
        // If not SuperAdmin, ensure they are not trying to access SuperAdmin area
        if (isSuperAdminArea && !hasSuperAdminRole) {
            AuthLogger.warn('[RouteGuard] Non-SuperAdmin user attempting to access SuperAdmin area - redirecting');
            await router.replace(getDefaultRoute());
            return;
        }

        // Example for Admin role (assuming '/admin' is for specific Admin functions, not the main dashboard)
        const hasAdminRole = user.roles.some(r => r.name === RoleEnum.Admin);
        if (isAdminArea && !hasAdminRole) { // If user accesses /admin but is not Admin or SuperAdmin
            AuthLogger.warn('[RouteGuard] Non-Admin user attempting to access Admin area - redirecting');
            await router.replace(getDefaultRoute());
            return;
        }

        // Handle root path for non-SuperAdmin authenticated users
        if (currentPath === '/') {
          const defaultRoute = getDefaultRoute(); // e.g., /dashboard/home
          AuthLogger.info('[RouteGuard] Root path accessed by authenticated user - redirecting to:', defaultRoute);
          await router.replace(defaultRoute);
          return;
        }

        // If we reach here, all checks passed and the user is authorized for the current protected route
        AuthLogger.success('[RouteGuard] Authorization successful for:', currentPath);
        setIsAuthorizing(false);

      } catch (error) {
        AuthLogger.error('[RouteGuard] Authorization check error:', error);
        // On error, better to redirect to login or an error page
        await router.replace('/login'); 
      } finally {
        checkInProgressRef.current = false; // Reset ref
      }
    };

    // Only run authorization check if router is ready
    if (router.isReady) {
      checkAuthorization();
    }

  }, [router, isAuthenticated, user, getPrimaryRole, getDefaultRoute]);

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  // Show loading screen while authorizing
  if (isAuthorizing) {
    AuthLogger.info('[RouteGuard] Displaying loading screen.', {
      isAuthorizing
    });
    return <AuthLoadingScreen />;
  }

  // Render protected content
  return <>{children}</>;
};

export default RouteGuard;