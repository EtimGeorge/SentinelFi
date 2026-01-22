# Senior Developer Escalation Report: Persistent Authentication Instability and UI Hangs

**Date:** January 22, 2026

**Agent:** Gemini CLI

**Project Context:** SentinelFi - A multi-tenant financial control application (Next.js frontend, NestJS backend, PostgreSQL database with TypeORM).

## 1. Problem Statement

The application exhibits severe and persistent authentication instability immediately following a successful SuperAdmin login:

*   **Repeated Logouts:** After logging in as `superadmin@sentinelfi.com`, the user is immediately redirected to the SuperAdmin dashboard (`/super`), but then instantly logged out and redirected back to `/login`. This cycle repeats.
*   **Preloader Hangs:** Subsequent login attempts often result in the frontend hanging indefinitely on a "Verifying Access" or "Initializing Command Center" preloader.
*   **Inconsistent Authorization Errors:** Initial debugging showed `403 Forbidden` errors for SuperAdmin routes (frontend/backend misalignments), which have been largely addressed. The current manifestation is `401 Unauthorized` for authenticated requests.
*   **Slow Login Times:** The `POST /auth/login/super` endpoint consistently takes an excessively long time to respond (8-15+ seconds). This significant delay is suspected to contribute to race conditions and session management issues.
*   **Frontend Runtime Errors:** Sporadic runtime errors in development mode (e.g., `uuid` function not found, HMR issues) destabilize the frontend and trigger full reloads, further complicating debugging.

The core issue appears to be a breakdown in reliable session establishment and maintenance after a successful login, leading to a dysfunctional user experience.

## 2. Debugging Journey (Chronological)

### Initial Symptoms:

1.  SuperAdmin user `superadmin@sentinelfi.com` logs in.
2.  Redirected to `/dashboard/home` (tenant dashboard).
3.  Immediately logged out and redirected to `/login`.
4.  Subsequent login attempts hang on preloader.

### Initial Hypothesis: Incorrect Frontend Redirection / Backend Role Authorization

**Steps Taken & Rationale:**

*   **Investigated `frontend/components/context/AuthContext.tsx`:**
    *   Identified `getPrimaryRole()` and `getDefaultRoute()` as key for redirection logic.
    *   **Finding:** `Role.SuperAdmin` was `undefined` during `AuthContext` evaluation due to module loading race conditions, causing `getPrimaryRole` to incorrectly evaluate.
    *   **Fix:** Modified `getPrimaryRole` to directly compare with the string literal `'SuperAdmin'`.
    *   **Result:** Redirect to `/super` now works, but application hangs on preloader or logs out immediately.

*   **Investigated `frontend/components/guards/RouteGuard.tsx`:**
    *   This component controls access and shows the preloader.
    *   **Finding:** The `hasSuperAdminRole` check within `RouteGuard` also used `Role.SuperAdmin`, which was `undefined` at the time of evaluation. This prevented the guard from releasing the preloader.
    *   **Fix:** Modified `hasSuperAdminRole` check to use the string literal `'SuperAdmin'`.
    *   **Result:** Preloader issue temporarily resolved, but immediately received `403 Forbidden` from backend for `/super/tenants`.

*   **Investigated `backend/src/auth/guards/roles.guard.ts`:**
    *   **Finding:** The `RolesGuard` in the backend was failing due to `Role.SuperAdmin` being `undefined` when passed to the `@Roles()` decorator, resulting in `requiredRoles: [null]`. This caused a `403 Forbidden` for legitimate SuperAdmin requests.
    *   **Fix:** Modified `roles.guard.ts` to be robust against `SimpleRole[]` or `string[]` and added extensive logging to trace `requiredRoles` and `userRoleNames`.
    *   **Finding:** The `requiredRoles` was still `[null]`, indicating the issue was in the decorator's argument evaluation.
    *   **Fix:** Modified `backend/src/auth/decorators/roles.decorator.ts` to allow `@Roles()` to accept `(Role | string)[]`.
    *   **Fix:** Systematically changed all `@Roles(Role.SuperAdmin)` in `backend/src/superadmin/superadmin.controller.ts` and `backend/src/audit/audit.controller.ts` to `@Roles('SuperAdmin')`.
    *   **Result:** Backend `RolesGuard` now correctly shows "Access granted" for SuperAdmin routes (e.g., `/super/tenants`, `/super/analytics/system-health`).

### Confirmed Remaining Issues:

1.  **Persistent `401 Unauthorized` from Frontend:** Despite backend logs showing `Access granted` for `/super/analytics/...` and `/super/tenants`, the frontend still reports `401 Unauthorized` for these requests, leading to immediate logout.
2.  **Extremely Slow Login:** The `POST /auth/login/super` consistently takes 8-15+ seconds, contributing to perceived application slowness and potential race conditions during session establishment.
3.  **Frontend Runtime Error (`uuid`):** `TypeError: (0 , uuid__WEBPACK_IMPORTED_MODULE_1__.v4) is not a function` in `store/toastStore.ts`, causing disruptive full reloads via Next.js Fast Refresh, further destabilizing the session.
    *   **Fix Attempted:** Changed `import { v4 as uuidv4 } from 'uuid';` to `import * as uuid from 'uuid';` and `uuidv4()` to `uuid.v4()`.
    *   **Result:** This specific error might be resolved, but the broader session instability persists.

## 3. Current Blocking Issue: Session Instability leading to immediate 401 Unauthorized

The most critical blocking issue is that immediately after a seemingly successful login where the backend validates the JWT and grants access (as per `RolesGuard` logs), the frontend's subsequent requests to protected endpoints return `401 Unauthorized`. This forces an immediate logout, trapping the user in a login/logout loop or infinite preloader.

This implies a breakdown in the cookie-based JWT session management *between* the backend successfully issuing the cookie and the frontend successfully presenting it for subsequent requests.

## 4. Hypotheses for Current Block

*   **Cookie Domain/Path Mismatch:** The `access_token` cookie set by the backend (`auth.controller.ts`) might not be correctly associated with the domain/path the frontend is requesting from, or with the API requests being made. (`sameSite: 'lax'` was set previously, but worth re-verifying `localhost` vs `127.0.0.1` consistency).
*   **Cookie `Expires` / Client-Side Clock Sync:** If the backend and frontend clocks are significantly out of sync, a newly issued JWT could be considered expired almost immediately by the frontend or by subsequent backend checks.
*   **Race Condition in `AuthContext` Initialization:** The frontend's `AuthContext` might be making API calls to protected routes before it has fully confirmed the user's authentication state *after* receiving the new `access_token` cookie, leading to requests without the necessary cookie. This is exacerbated by the slow login.
*   **Next.js HMR/StrictMode Interference:** The development environment's HMR and React StrictMode might be aggressively re-rendering/re-mounting components, causing temporary loss of session state or interfering with cookie handling.
*   **Backend `JwtStrategy` `cookieExtractor` Fluctuation:** While the logging shows `access_token` being extracted, it's possible this is intermittent or related to specific request contexts. The `read ECONNRESET` from earlier logs also points to potential connection issues.
*   **`TenantAccessGuard` Interference:** While `TenantAccessGuard` logged "granted full access", its internal logic might still be a factor, though less likely now with `401`s.

## 5. Files of Concern (Post-Modifications):

### Frontend:

*   `frontend/pages/_app.tsx`: Root component, layout selection logic modified for 'SuperAdmin' string.
    ```typescript
    // ...
    // Determine layout based on primary role for authenticated users
    const hasSuperAdmin = user?.roles.some(r => {
        const name = typeof r === 'string' ? r : r.name;
        return name === 'SuperAdmin'; // Now uses string literal
    });

    if (hasSuperAdmin) {
      AuthLogger.info('[_app] Applying SuperAdminLayout for SuperAdmin user.');
      return <SuperAdminLayout>{page}</SuperAdminLayout>;
    }
    // ...
    ```
*   `frontend/components/guards/RouteGuard.tsx`: Authenticated routing and preloader logic modified for 'SuperAdmin' string.
    ```typescript
    // ...
    const hasSuperAdminRole = user.roles.some(r => (typeof r === 'string' ? r : r.name) === 'SuperAdmin'); // Now uses string literal
    // ...
    ```
*   `frontend/components/context/AuthContext.tsx`: Core authentication context, login/logout, role determination.
    ```typescript
    // ...
    const getPrimaryRole = useCallback((): Role | null => {
        // ...
        const isSuperAdmin = user.roles.some(r => getRoleName(r) === 'SuperAdmin');
        if (isSuperAdmin) {
          return 'SuperAdmin'; // Now returns string literal
        }
        return getRoleName(user.roles[0]) as Role;
    }, [user]);

    const getDefaultRoute = useCallback((): string => {
        const primaryRole = getPrimaryRole();
        if (primaryRole === 'SuperAdmin') return '/super'; // Now uses string literal
        return '/dashboard/home';
    }, [getPrimaryRole]);

    const login = useCallback(async (email: string, password: string, role: Role) => {
        // ...
        const endpoint = role === 'SuperAdmin' ? '/auth/login/super' : '/auth/login/tenant'; // Now uses string literal
        // ...
    }, []);

    export const ROLE_ROUTES: Record<Role, string[]> = {
      ['SuperAdmin']: ['/super'], // Now uses string literal
      // ...
    };
    ```
*   `frontend/pages/login.tsx`: Login form, initiates login process.
    ```typescript
    // ...
    const role = loginMode === LoginMode.SUPER_ADMIN ? 'SuperAdmin' as Role : Role.Admin; // Now uses string literal, with cast for type safety
    // ...
    ```
*   `frontend/components/hooks/useSecuredApi.ts`: Handles 401/403 errors and triggers logout.
    ```typescript
    // ...
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error(`[SECURED API] ${error.response.status} detected. Logging out.`, error.config?.url);
      logout(); // This is the trigger for repeated logouts
    }
    // ...
    ```
*   `frontend/pages/super/index.tsx`: SuperAdmin Dashboard page, fetches initial data.
    *   Paths corrected: `/super/analytics/system-health`, `/super/analytics/total-users`, `/super/analytics/mrr-estimate`.
    *   Defensive checks added for `tenants` array before `.filter()` and `.forEach()`.
    *   Still reports `401 Unauthorized` for initial data fetches.
*   `frontend/store/toastStore.ts`: `uuid` import corrected to `import * as uuid from 'uuid';` and usage to `uuid.v4()`.

### Backend:

*   `backend/src/main.ts`: NestJS bootstrap, cookie configuration (potentially relevant for `sameSite`, `secure` settings).
*   `backend/src/auth/auth.controller.ts`: Handles login (`/auth/login/super` sets `access_token` cookie).
    ```typescript
    // ...
    @Post('login/super')
    @Public()
    async loginSuperAdmin(
      @Body() authCredentialDto: AuthCredentialDto,
      @Res({ passthrough: true }) response: Response,
    ) {
      const { accessToken, user } = await this.authService.loginSuperAdmin(
        authCredentialDto,
      );
      response.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Potentially critical setting for local development
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      return { user };
    }
    // ...
    ```
*   `backend/src/auth/jwt.strategy.ts`: Validates JWT, extracts token from cookies. **Extensive logging added.**
    ```typescript
    // ...
    const cookieExtractor = (req: Request): string | null => {
      const logger = new Logger("CookieExtractor");
      let token = null;
      if (req && req.cookies) {
        logger.debug(`[Extract] Request cookies: ${JSON.stringify(req.cookies)}`); // NEW LOG
        token = req.cookies["access_token"];
        if (token) {
          logger.log("[Extract] ✅ JWT token found in `access_token` cookie.");
        } else {
          logger.warn("[Extract] ❌ `access_token` cookie NOT found."); // NEW LOG
        }
      } else {
        logger.warn("[Extract] Request or cookies are undefined."); // NEW LOG
      }
      return token;
    };
    // ...
    @Injectable()
    export class JwtStrategy extends PassportStrategy(Strategy) {
      // ...
      async validate(payload: JwtPayload): Promise<UserPayload> {
        this.logger.debug(`[Validate] Received payload: ${JSON.stringify(payload)}`); // NEW LOG
        // ...
        this.logger.debug(`[Validate] UserPayload returned: ${JSON.stringify(userPayloadToReturn)}`); // NEW LOG
        this.logger.log(`[Validate] Returning user payload with tenant_id: ${userPayloadToReturn.tenant_id}`);
        return userPayloadToReturn;
      }
    }
    ```
*   `backend/src/auth/guards/roles.guard.ts`: Role-based authorization. **Extensive logging added.**
    *   Logic confirmed to correctly parse `requiredRoles` (`['SuperAdmin']`) and `userRoleNames` (`['SuperAdmin']`) and grant access.
*   `backend/src/auth/decorators/roles.decorator.ts`: `@Roles` decorator now accepts `(Role | string)[]`.
*   `backend/src/superadmin/superadmin.controller.ts`: All `@Roles(Role.SuperAdmin)` changed to `@Roles('SuperAdmin')`.
*   `backend/src/audit/audit.controller.ts`: `@Roles(Role.SuperAdmin)` changed to `@Roles('SuperAdmin')`.
*   `@shared/types/role.enum.ts`: String enum for `Role`.
*   `@shared/types/user.ts`: Defines `JwtPayload` (roles: `string[]`) and `UserPayload` (roles: `SimpleRole[]`).

## 6. Recommendations/Questions for Senior Dev

The persistent `401 Unauthorized` errors, despite the backend logging "Access granted" and the `access_token` cookie being present and seemingly valid in `JwtStrategy` logs, indicate a complex interaction issue between the frontend (browser's cookie handling, Next.js client-side navigation) and the backend (session management, JWT validation). The extremely slow login time exacerbates these issues by creating a larger window for race conditions.

**Key areas for investigation:**

1.  **Frontend/Browser Cookie Sync & Transmission:**
    *   **Browser-specific behavior:** Are certain browsers (or browser versions) more aggressive in discarding `sameSite=lax` cookies or failing to attach them immediately after a redirect or page refresh, especially given the `localhost:3000` (frontend) to `localhost:3001` (backend) origin difference?
    *   **Next.js Client-Side Navigation vs. Full Page Reloads:** How does Next.js's router handle subsequent requests after a `router.replace()` or `router.push()` in relation to cookie availability?
    *   **Cookie Expiration/Max-Age vs. Browser Sync:** Is there a subtle timing issue where the browser might be deleting/invalidating the cookie too soon, or the backend's JWT expiration logic is too tight for the slow login?

2.  **Backend Session Management Robustness:**
    *   **JWT Revocation/Blacklisting:** Is there any mechanism that might be inadvertently revoking or blacklisting the JWT between the login response and the first protected API call?
    *   **Database connection stability during JWT validation:** The `JwtStrategy`'s `validate` method performs a DB lookup. Could intermittent DB connection issues (e.g., `ECONNRESET` previously observed) cause validation failures that are not caught as `401`s, but lead to the session being dropped?

3.  **HMR/StrictMode Interactions in Development:**
    *   The `webpack.js:825 [HMR] unexpected require(...) to disposed module` warnings in frontend logs are indicative of HMR issues. Combined with React StrictMode's double-rendering, could these be causing temporary desynchronization of authentication state or cookie access in the frontend during development, leading to `401`s?

**Proposed Next Steps for Senior Dev:**

1.  **Review Cookie Configuration:** Explicitly review the `response.cookie` settings in `backend/src/auth/auth.controller.ts` (especially `sameSite`, `secure`, `domain`, `path`) and their interaction with `localhost` in development. Consider temporarily loosening `sameSite` or explicitly setting `domain` to see if it resolves the `401`.
2.  **Frontend/Backend Clock Skew Check:** Advise on a method to check for significant clock differences between the machine running the frontend and backend, which could affect JWT validity.
3.  **Trace HTTP Request/Response Headers (Manual Inspection/Proxy Tool):** Recommend using a network proxy tool (e.g., Fiddler, Charles, Wireshark) to capture the *exact* HTTP requests (including all headers, especially `Cookie`) and responses for `/auth/login/super` and subsequent `/super/tenants` requests. This will definitively confirm if the `access_token` cookie is being sent by the browser.
4.  **Backend Request Logging (Middleware):** Suggest adding a global NestJS middleware or interceptor that logs *all incoming request headers* (especially `Cookie`) before any guards are applied. This would conclusively show if the `access_token` is present at the very beginning of the backend request pipeline for the `/super/tenants` call.
5.  **Revisit JWT Expiration Strategy:** Analyze the JWT expiration (`exp` claim) and its validation for any edge cases that might cause immediate invalidation.
6.  **Temporarily Disable StrictMode (Frontend):** Advise temporarily disabling React `StrictMode` in `frontend/pages/_app.tsx` to see if it alleviates the development-specific session instability caused by double-rendering.

---
**End of Report**