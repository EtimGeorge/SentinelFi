# Senior Developer Escalation Report: Persistent Frontend Preloader Issue

**Date:** January 18, 2026

**Project:** SentinelFi Frontend

**Problem Description:**
The frontend application remains stuck on a preloader screen indefinitely during initial page load in local development. This issue persists despite extensive debugging and implementation of advanced React patterns to manage component lifecycles.

**Symptoms:**
- Application loads in the browser, displays the preloader (`AppLoadingFallback` initially, then `AuthLoadingScreen` as per user's request).
- The console logs repeatedly show: `[AUTH] ⚠️ Attempted state update after unmount - ignoring` originating from `AuthProvider`'s `updateState` function.
- The `isInitialized` state in the `AuthContext` (and consequently `RouteGuard`) never consistently becomes `true`, preventing the application from transitioning to the login page.
- The `initializeAuthEffect` is triggered, `memoizedFetchCurrentUser` runs (and logs `No token found for fetching current user.`, which is expected for an unauthenticated user), but the final `updateState` to set `isInitialized: true` appears to be racing with component unmounts.

**Relevant Logs (Latest):**
```
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:46 [HMR] connected
AuthContext.tsx:85 [AUTH] Auth initialization effect triggered.
AuthContext.tsx:85 [AUTH] Fetching current user...
AuthContext.tsx:89 [AUTH] ⚠️ No token found for fetching current user.
warn @ AuthContext.tsx:89
eval @ AuthContext.tsx:326
eval @ AuthContext.tsx:364
eval @ AuthContext.tsx:365
initializeAuthEffect @ AuthContext.tsx:381
eval @ AuthContext.tsx:405
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
AuthContext.tsx:85 [AUTH] Auth initialization effect triggered.
AuthContext.tsx:89 [AUTH] ⚠️ Attempted state update after unmount - ignoring
```

**Context:**
- Next.js 14.1.4 development environment.
- React Strict Mode is active (default for Next.js dev server).
- Monorepo setup: Frontend (Next.js), Backend (NestJS).

**Debugging Journey & Actions Taken:**

1.  **Initial Diagnosis (Preloader Stuck):** Identified that `isInitialized` flag in `AuthContext` was perpetually `false`, preventing UI transition.
2.  **Backend Seeder Error Fix:** Discovered a critical `bcryptjs` error in `backend/src/auth/initial-superadmin-seeder.service.ts` due to `password_hash` not being selected (due to `select: false` on entity). Fixed this using TypeORM QueryBuilder's `addSelect`. **Backend now starts cleanly.**
3.  **Frontend `ReferenceError` Fix:** Corrected a `ReferenceError: AppLoadingFallback is not defined` by adding the missing import in `frontend/components/context/AuthContext.tsx`.
4.  **Architectural Refactor (AuthProvider Controls Loading):** Modified `AuthProvider` (`AuthContext.tsx`) to directly render `AppLoadingFallback` while `!state.isInitialized`, ensuring no children render prematurely. Removed redundant checks from `_app.tsx` and `RouteGuard.tsx`.
5.  **Preloader Consolidation (Reverted):** Initially consolidated `AuthLoadingScreen` into `AppLoadingFallback`, but reverted this based on user's request to keep `AuthLoadingScreen` distinct for `RouteGuard`.
6.  **Advanced Refactor (Singleton Promise Pattern):**
    *   Implemented a module-level `initialAuthPromise` (`frontend/components/context/AuthContext.tsx`) to store the result of the first `fetchCurrentUser` call.
    *   Refactored `fetchCurrentUser` into `_fetchCurrentUser` (internal logic) and `memoizedFetchCurrentUser` (singleton promise manager).
    *   The `useEffect` in `AuthProvider` now awaits `memoizedFetchCurrentUser`, ensuring the async auth check runs only once per page load, even with Strict Mode's double-invocation.
    *   `initialAuthPromise` is reset on `login`, `logout`, and `refreshAuth` for fresh checks when appropriate.
    *   `useCallback` dependencies updated.

**Current State:**
- The backend is stable and starts without errors.
- The frontend still shows the preloader indefinitely.
- The `AuthProvider` is still reporting `Attempted state update after unmount - ignoring`, indicating that the component instance which initiated the state update is unmounting before the update can be safely applied, despite the singleton promise and `isMountedRef` checks. This implies that even with these measures, the component's lifecycle is being aggressively disrupted.

**Hypothesis:**
The core problem is a deep interaction between React's component lifecycle in development (specifically with Strict Mode's aggressive remounting behavior) and possibly Next.js's Fast Refresh, leading to the root `AuthProvider` component effectively being unmounted and re-mounted before its critical state updates (`isInitialized: true`) can stabilize. This defeats the purpose of internal `isMountedRef` checks if the entire component instance (and thus its `isMountedRef`) is being destroyed and re-created.

**Request for Senior Developer Assistance:**
We require assistance in diagnosing why the root `AuthProvider` component is experiencing such aggressive unmounting/remounting during initial page load in the Next.js development environment. This behavior is preventing the authentication state from becoming stable and blocking the application from rendering the login page.
Specifically, insights into how to make `AuthProvider`'s state updates resilient to these unmount/remount cycles during initial render, or identifying external factors (e.g., in `_app.tsx` or Next.js config) that could be causing this, would be invaluable.

---
**Code Snippets (relevant to `AuthProvider` lifecycle):**

`frontend/components/context/AuthContext.tsx`
```typescript
// SINGLETON PROMISE FOR INITIAL AUTH CHECK
let initialAuthPromise: Promise<AppUser | null> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(/* ... initial state ... */);

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

  // ... _fetchCurrentUser, memoizedFetchCurrentUser definitions ...

  useEffect(() => {
    const initializeAuthEffect = async () => {
      AuthLogger.info('Auth initialization effect triggered.');
      try {
        const user = await memoizedFetchCurrentUser(); // Await the shared, memoized promise

        updateState({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          isInitialized: true,
          isInitialLoad: false,
          error: user ? null : 'No active session',
        });

      } catch (error) {
        AuthLogger.error('Auth initialization effect failed', error);
        updateState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          isInitialLoad: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initializeAuthEffect();

  }, [memoizedFetchCurrentUser, updateState]);

  // ... other functions (login, logout, refreshAuth) where initialAuthPromise is reset ...

  if (!state.isInitialized) {
    return <AppLoadingFallback message="Initializing Session..." />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```
`frontend/pages/_app.tsx`
```typescript
function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth(); // No more isInitialLoad here

  // No longer checking isInitialLoad here; AuthProvider handles initial rendering
  // ... Public Routes check ...
  // ... Unauthenticated users on protected routes check ...
  // ... Authenticated users - Select layout based on PRIMARY ROLE ...
}

export default function App(props: AppProps) {
  return (
    <>
      <Head>{/* ... */}</Head>
      
      <AuthProvider>
        <RouteGuard>
          <AppContent {...props} />
        </RouteGuard>
      </AuthProvider>
      <Toaster position="bottom-right" />
    </>
  );
}
```
`frontend/components/guards/RouteGuard.tsx`
```typescript
const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const router = useRouter();
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    getPrimaryRole, // isInitialized removed from here
    getDefaultRoute 
  } = useAuth();

  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const checkInProgressRef = useRef(false);

  useEffect(() => {
    // No longer checking isInitialized here; AuthProvider guarantees it's true when this renders
    if (checkInProgressRef.current || !router.isReady) {
      AuthLogger.info('[RouteGuard] Waiting for router readiness, or check in progress.', {
        checkInProgress: checkInProgressRef.current,
        routerReady: router.isReady,
      });
      return;
    }
    // ... rest of authorization logic ...
  }, [router, isAuthenticated, user, getPrimaryRole, getDefaultRoute]);

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
```