// frontend/pages/_app.tsx
import type { AppProps } from 'next/app';
import type { NextPage } from 'next'; // Import NextPage
import { useRouter } from 'next/router';
import { useEffect, ReactElement, ReactNode } from 'react'; // Import ReactElement and ReactNode
import Head from 'next/head'; // Import Head
import { AuthProvider, useAuth, PUBLIC_ROUTES, AuthLogger } from '../components/context/AuthContext'; // Using relative path for AuthContext
import RouteGuard from '../components/guards/RouteGuard'; // Using relative path for RouteGuard
import SuperAdminLayout from '../components/Layout/SuperAdminLayout'; // Using relative path for SuperAdminLayout
import SecuredLayout from '../components/Layout/SecuredLayout'; // Using relative path for SecuredLayout
import PublicLayout from '../components/Layout/PublicLayout'; // New PublicLayout
import AppLoadingFallback from '../components/common/AppLoadingFallback'; // New AppLoadingFallback
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast'; // For toast notifications
import { Role } from '../components/context/AuthContext'; // Import Role for layout determination

// ============================================================================
// LAYOUT TYPING (NEW)
// ============================================================================
export type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

// ============================================================================
// APP CONTENT - Layout selection logic
// This component MUST be inside AuthProvider and RouteGuard to access auth context
// ============================================================================

function AppContent({ Component, pageProps }: AppPropsWithLayout) { // Use AppPropsWithLayout
  const { isInitialized, isAuthenticated, user } = useAuth();
  const router = useRouter();

  // If AuthProvider is not yet initialized or user status is pending, show fallback
  if (!isInitialized) {
    AuthLogger.info('[_app] AuthProvider not yet initialized. Showing fallback.');
    return <AppLoadingFallback message="Initializing Authentication..." />;
  }

  // This check should ideally be handled by RouteGuard, but as a safeguard:
  // If not authenticated and trying to access a non-public route, show fallback.
  // RouteGuard will eventually redirect.
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
    AuthLogger.warn('[_app] Not authenticated on protected route. RouteGuard will redirect.');
    return <AppLoadingFallback message="Redirecting to Login..." />;
  }

  // Pages can define a custom layout, otherwise use the default
  const getLayout = Component.getLayout || ((page) => {
    // Default layout logic based on authentication and user roles
    if (!isAuthenticated) {
      AuthLogger.info('[_app] Applying PublicLayout as unauthenticated.');
      return <PublicLayout>{page}</PublicLayout>;
    }

    // Determine layout based on primary role for authenticated users
    const hasSuperAdmin = user?.roles.some(r => {
        const name = typeof r === 'string' ? r : r.name;
        return name === 'SuperAdmin';
    });

    if (hasSuperAdmin) {
      AuthLogger.info('[_app] Applying SuperAdminLayout for SuperAdmin user.');
      return <SuperAdminLayout>{page}</SuperAdminLayout>;
    }

    AuthLogger.info('[_app] Applying SecuredLayout for tenant user.');
    return <SecuredLayout>{page}</SecuredLayout>;
  });

  return getLayout(<Component {...pageProps} />);
}

// ============================================================================
// MAIN APP COMPONENT
// This wraps the entire application with AuthProvider and RouteGuard.
// ============================================================================

export default function App(props: AppProps) {
  // ============================================================================
  // GLOBAL ERROR HANDLER - Suppress CanceledError from React StrictMode
  // ============================================================================
  useEffect(() => {
    /**
     * CRITICAL FIX: Suppress unhandled CanceledError promise rejections.
     * 
     * React StrictMode mounts components twice in development, causing the first
     * fetch to be aborted. This creates a brief moment where the CanceledError
     * exists as an unhandled promise rejection before our catch handler processes it.
     * 
     * This is a standard React pattern for handling request cancellations.
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if this is a CanceledError from axios
      if (
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        error?.message?.includes('canceled')
      ) {
        // Prevent the error overlay from showing
        event.preventDefault();
        
        // Log for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.debug('[App] Suppressed CanceledError:', error.message);
        }
      }
      // Let other errors propagate normally
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {/* Head component for global metadata, can be overridden by individual pages */}
      <Head>
        <title>SentinelFi - WBS Financial Control</title>
        <meta name="description" content="SentinelFi: Real-Time Control. Proactive Precision." />
        <link rel="icon" href="/SentinelFi Logo Concept-bg-remv-logo-only.png" />
      </Head>
      
      <AuthProvider>
        <RouteGuard>
          <AppContent {...props} />
        </RouteGuard>
      </AuthProvider>
      <Toaster position="bottom-right" /> {/* Global toast notifications */}
    </>
  );
}