// frontend/pages/_app.tsx
import type { AppProps } from 'next/app';
import type { NextPage } from 'next'; // Import NextPage
import { useRouter } from 'next/router';
import { useEffect, ReactElement, ReactNode } from 'react'; // Import ReactElement and ReactNode
import Head from 'next/head'; // Import Head
import { AuthProvider, useAuth, PUBLIC_ROUTES, AuthLogger } from '../components/context/AuthContext'; // Using relative path for AuthContext
import { BreadcrumbProvider } from '../components/context/BreadcrumbContext'; // Breadcrumb state management
import { CurrencyProvider } from '../components/context/CurrencyContext'; // Currency state management
import RouteGuard from '../components/guards/RouteGuard'; // Using relative path for RouteGuard
// import RouteGuard from '../components/guards/RouteGuard'; // Using relative path for RouteGuard
import SecuredLayout from '../components/Layout/SecuredLayout'; // Using relative path for SecuredLayout
import PublicLayout from '../components/Layout/PublicLayout'; // New PublicLayout
import AppLoadingFallback from '../components/common/AppLoadingFallback'; // New AppLoadingFallback
import '../styles/globals.css';
import '../styles/marketing.css';
import { Toaster } from 'react-hot-toast'; // For toast notifications
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Role } from '../components/context/AuthContext';
import { apiClient } from '../lib/api';
import useUIStore from '../store/uiStore';
import { AIChatFAB } from '../components/ai';
import { TourProvider } from '../contexts/TourContext';
import ToastProvider from '../components/ToastProvider';

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

// ─── AI page context map ────────────────────────────────────────────────────
const PAGE_CONTEXT_MAP: Record<string, string> = {
  '/financials/projects/wbs': 'wbs',
  '/financials/intelligence': 'capex-dashboard',
  '/financials/operations/planning': 'opex-dashboard',
  '/budget/draft': 'budget-draft',
  '/reporting/opex': 'opex-dashboard',
};

function AppContent({ Component, pageProps }: AppPropsWithLayout) { // Use AppPropsWithLayout
  const { isInitialized, isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Derive page context for AI widget
  const currentPageCtx = Object.entries(PAGE_CONTEXT_MAP).find(
    ([path]) => router.pathname.includes(path)
  )?.[1];

  // Derive project ID from route if available
  const projectId = router.query.id as string | undefined;

  // Marketing/auth pages must never mount the workspace AI assistant, even for
  // signed-in users browsing the public site.
  const cleanPath = router.pathname.split('?')[0];
  const isPublicRoute = PUBLIC_ROUTES.some((route) => {
    if (route.includes('(') || route.includes('*')) {
      return new RegExp(`^${route}$`).test(cleanPath);
    }
    return route === cleanPath;
  });

  // If AuthProvider is not yet initialized or user status is pending, show fallback
  if (!isInitialized) {
    AuthLogger.info('[_app] AuthProvider not yet initialized. Showing fallback.');
    return <AppLoadingFallback message="Initializing Authentication..." />;
  }

  // Pages can define a custom layout, otherwise use the default
  const getLayout = Component.getLayout || ((page) => {
    // Public/marketing routes must NEVER be wrapped in the secured chrome - 
    // even when the visitor holds a valid session. Pages that run their own
    // layout (MarketingLayout etc.) define getLayout and bypass this entirely.
    if (isAuthenticated && !isPublicRoute) {
      AuthLogger.info('[_app] Applying SecuredLayout.');
      return <SecuredLayout>{page}</SecuredLayout>;
    }

    return <PublicLayout>{page}</PublicLayout>;
  });

  return (
    <>
      {getLayout(<Component {...pageProps} />)}
      {/* Global AI Assistant FAB - authenticated workspace pages only, never public/marketing routes */}
      {isAuthenticated && !isPublicRoute && (
        <AIChatFAB />
      )}
    </>
  );
}

// ============================================================================
// NOTIFICATION SYNC (NEW)
// Syncs the total pending actions to the global UI store for the header bell
// ============================================================================
function NotificationWatcher() {
  const { isAuthenticated, user } = useAuth();
  const setUnreadCount = useUIStore((state) => state.setUnreadNotificationsCount);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const isForbidden = (e: any) => e?.response?.status === 403 || e?._isForbidden;
    const isServerError = (e: any) => e?.response?.status >= 500;
    const fetchCounts = async () => {
      try {
        // Fetch counts for both WBS and Requisitions, suppress 403 (RBAC) and 500 (server errors) silently
        const [wbs, reqs] = await Promise.all([
          apiClient.get('/wbs/budgets?status=pending&limit=1').catch((e: any) => {
            if (isForbidden(e)) return null;
            if (isServerError(e)) return null;
            throw e;
          }), apiClient.get('/finance-core/requisitions').catch((e: any) => {
            if (isForbidden(e)) return [];
            if (isServerError(e)) return [];
            return [];
          }),
        ]);

        if (!wbs && Array.isArray(reqs) && reqs.length === 0) {
          setUnreadCount(0);
          return;
        }

        const wbsCount = (wbs as any)?.total || (Array.isArray(wbs) ? (wbs as any).length : 0) || 0;

        const reqData: any[] = Array.isArray(reqs) ? reqs : ((reqs as any)?.data || []);
        const reqCount = reqData.filter((r: any) => r.status === 'PENDING_APPROVAL').length;

        setUnreadCount(wbsCount + reqCount);
      } catch (error: any) {
        if (isForbidden(error)) {
          console.debug('[NotificationWatcher] Skipped, insufficient role');
          return;
        }
        // FIX: Don't spam console.error on server errors, they're expected during backend instability
        if (isServerError(error)) {
          console.debug('[NotificationWatcher] Server unavailable, skipping sync');
          return;
        }
        console.error('[NotificationWatcher] Failed to sync counts:', error);
      }
    };

    // Defer initial sync until the browser is idle so it doesn't compete with
    // first-paint nav data (Sidebar/LayoutNav projects, auth bootstrap).
    const scheduleInitial = () => {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => fetchCounts(), { timeout: 4000 });
      } else {
        setTimeout(fetchCounts, 1500);
      }
    };
    scheduleInitial();
    // Poll every 3 minutes for enterprise-level responsiveness
    const interval = setInterval(fetchCounts, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id, setUnreadCount]);

  return null;
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

      <ErrorBoundary>
        <AuthProvider>
          <BreadcrumbProvider>
            <CurrencyProvider>
              <TourProvider>
                <RouteGuard>
                  <ToastProvider>
                    <NotificationWatcher />
                    <AppContent {...props} />
                  </ToastProvider>
                </RouteGuard>
              </TourProvider>
            </CurrencyProvider>
          </BreadcrumbProvider>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000, style: {
              background: '#1a1a2e', color: '#e2e8f0', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '14px 18px', fontSize: '14px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }, success: {
              iconTheme: { primary: '#22c55e', secondary: '#1a1a2e' },
            }, error: {
              iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' },
            },
          }}
        />
      </ErrorBoundary>
    </>
  );
}