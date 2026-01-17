// frontend/pages/_app.tsx
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth, PUBLIC_ROUTES } from '../components/context/AuthContext'; // Using relative path for AuthContext
import RouteGuard from '../components/guards/RouteGuard'; // Using relative path for RouteGuard
import SuperAdminLayout from '../components/Layout/SuperAdminLayout'; // Using relative path for SuperAdminLayout
import SecuredLayout from '../components/Layout/SecuredLayout'; // Using relative path for SecuredLayout
import PublicLayout from '../components/Layout/PublicLayout'; // New PublicLayout
import AppLoadingFallback from '../components/common/AppLoadingFallback'; // New AppLoadingFallback
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast'; // For toast notifications
import { Role as RoleEnum } from '@shared/types/role.enum'; // Import RoleEnum directly

// ============================================================================
// APP CONTENT - Layout selection logic
// This component MUST be inside AuthProvider and RouteGuard to access auth context
// ============================================================================

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();

  // ========================================================================
  // CRITICAL: Wait for auth initialization
  // Show a basic loading screen until AuthContext is fully initialized.
  // This prevents layout flashes and ensures auth state is stable for RouteGuard and layout selection.
  // ========================================================================
  if (!isInitialized || isLoading) {
    AuthLogger.info('[_app] Auth still initializing or loading user...', { isInitialized, isLoading });
    return <AppLoadingFallback />;
  }

  // ========================================================================
  // PUBLIC ROUTES - Use PublicLayout for pages like login, register, etc.
  // = These do not require authentication for initial access.
  // ========================================================================
  if (PUBLIC_ROUTES.includes(router.pathname)) {
    AuthLogger.info('[_app] Rendering PublicLayout for:', router.pathname);
    return (
      <PublicLayout>
        <Component {...pageProps} />
      </PublicLayout>
    );
  }

  // ========================================================================
  // UNAUTHENTICATED USERS ON PROTECTED ROUTES
  // This scenario should be caught by RouteGuard, which will redirect to /login.
  // We return a fallback here to prevent rendering sensitive content.
  // ========================================================================
  if (!isAuthenticated || !user) {
    AuthLogger.warn('[_app] User not authenticated on a protected route. RouteGuard should handle redirect.');
    return <AppLoadingFallback />; // RouteGuard will eventually redirect to login
  }

  // ========================================================================
  // AUTHENTICATED USERS - Select layout based on PRIMARY ROLE
  // = Now that we are sure user is authenticated and state is initialized,
  // = we select the appropriate layout.
  // ========================================================================
  
  const hasSuperAdmin = user.roles.some(r => r.name === RoleEnum.SuperAdmin);
  // Add other role checks if necessary for specific layouts, or use getPrimaryRole() from context
  // For now, simple SuperAdmin vs. Tenant user distinction.

  AuthLogger.info('[_app] Layout selection for authenticated user:', {
    email: user.email,
    roles: user.roles.map(r => r.name),
    hasSuperAdmin,
    pathname: router.pathname,
  });

  // SuperAdmin gets SuperAdminLayout
  if (hasSuperAdmin) {
    AuthLogger.info('[_app] ✅ Rendering SuperAdminLayout');
    return (
      <SuperAdminLayout>
        <Component {...pageProps} />
      </SuperAdminLayout>
    );
  }

  // All other authenticated users (e.g., Admin, Manager, etc.) get SecuredLayout
  AuthLogger.info('[_app] ✅ Rendering SecuredLayout for tenant user');
  return (
    <SecuredLayout>
      <Component {...pageProps} />
    </SecuredLayout>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// This wraps the entire application with AuthProvider and RouteGuard.
// ============================================================================

export default function App(props: AppProps) {
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