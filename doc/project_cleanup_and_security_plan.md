# SentinelFi: Project Cleanup and Security Hardening Plan

## 1. Executive Summary

This document outlines the findings of a comprehensive code review and presents a prioritized plan to resolve critical security vulnerabilities and stabilize the development environment.

The review identified three major issues:

1.  **CRITICAL: Exposed Production Secrets:** The `.env.prod` file contains production database credentials and the JWT secret key. If this file has been committed to version control, these secrets must be considered compromised.
2.  **CRITICAL: High-Risk XSS Vulnerability:** The application currently stores authentication tokens (JWTs) in the browser's `localStorage`. This is a significant security flaw that makes user sessions vulnerable to theft via Cross-Site Scripting (XSS) attacks.
3.  **Unstable Development Environment:** The backend build process is failing on the local development machine, which prevents any reliable development or testing. A temporary frontend proxy was implemented as a workaround, but this masks the underlying issue and adds unnecessary complexity.

The following plan will address these issues systematically, starting with the necessary user actions to create a secure and stable foundation.

## 2. Pre-requisites (Required User Actions)

Before any code modifications can begin, the following actions must be performed by you on your local machine.

### 2.1. Stabilize the Local Build Environment

The backend build failure is the highest priority blocker. As detailed in the initial troubleshooting report, this is an environmental issue.

**Action:**
1.  **Move the project folder** (`SentinelFi`) out of any OneDrive-synced directory and into a simple, local path (e.g., `C:\Development\`).
2.  **Always run your terminal (CLI) with "Run as administrator"** to prevent permissions issues.
3.  Navigate to the `backend` directory and run `npm run build`.
4.  **Confirm that the `dist` directory is successfully created inside the `backend` folder.**

I cannot proceed until the backend can be built successfully.

### 2.2. Secure Project Secrets

**Action:**
1.  **Rotate Credentials:**
    *   Go to your Neon database dashboard and **generate a new password**.
    *   Create a **new, random, long string** to use as your `JWT_SECRET_KEY`.
2.  **Update Local Environment File:**
    *   After rotating the secrets, update the `.env.local` file in the root of the project with the new values. **Do not commit this file.**
3.  **Secure the `.gitignore` file:** I will perform this step for you after you confirm the above actions are complete. This will prevent secrets from being accidentally committed in the future.

**Please confirm once you have completed sections 2.1 and 2.2.** Do not share the new secrets with me.

## 3. Detailed Implementation Plan

Once the pre-requisites are met, I will execute the following plan.

### Phase 1: Remove Temporary Frontend Proxy

The goal of this phase is to remove the unnecessary proxy and establish direct, correct communication between the frontend and backend.

1.  **Update Backend CORS Configuration:**
    *   **File:** `backend/src/main.ts`
    *   **Action:** Modify the `enableCors` options to explicitly allow requests from the frontend's origin (`http://localhost:3001` in development) and to accept credentials (cookies), which will be needed for the new authentication flow.
2.  **Remove Frontend Proxy:**
    *   **File:** `frontend/next.config.js`
    *   **Action:** Delete the `rewrites` configuration block.
3.  **Update Frontend API URL:**
    *   **File:** `frontend/.env.local`
    *   **Action:** Change `NEXT_PUBLIC_API_URL` from `/api/v1` to the full backend URL: `http://localhost:3000/api/v1`.

### Phase 2: Implement Secure HttpOnly Cookie Authentication

This is the core security fix. We will refactor the authentication flow to stop using `localStorage` and start using secure, `HttpOnly` cookies.

1.  **Backend Changes:**
    *   **Install Dependency:** Add the `cookie-parser` library to the backend: `npm install cookie-parser`.
    *   **Enable Cookie Parser:** In `backend/src/main.ts`, register `cookie-parser` as global middleware.
    *   **Modify Login Logic:**
        *   **File:** `backend/src/auth/auth.controller.ts`
        *   **Action:** Inject the `Response` object from `@nestjs/common` into the `login` method.
        *   **File:** `backend/src/auth/auth.service.ts`
        *   **Action:** Modify the `login` service method. Instead of returning the access token in the JSON response, it will use the `Response` object to set a secure, `HttpOnly` cookie containing the token. The JSON response will now simply contain user data.
    *   **Modify JWT Strategy:**
        *   **File:** `backend/src/auth/jwt.strategy.ts`
        *   **Action:** Update the strategy to extract the JWT from the incoming request's cookies instead of the `Authorization` header.

2.  **Frontend Changes:**
    *   **Modify API Client:**
        *   **File:** `frontend/lib/api.ts`
        *   **Action:** Configure the global Axios instance to include credentials (`withCredentials: true`) with every request. This tells the browser to automatically send the cookie.
    *   **Refactor AuthContext:**
        *   **File:** `frontend/components/context/AuthContext.tsx`
        *   **Action:** This is the largest change.
            *   Remove all references to `localStorage`.
            *   Remove the `token` from the component's state. The token is no longer directly accessible to the frontend.
            *   The `login` function will still call the API, but it will now store the *user data* returned from the successful login, not a token.
            *   The `logout` function will call a new backend endpoint (to be created) that clears the `HttpOnly` cookie.
            *   The application's "logged in" state will now be determined by the presence of user data in the context, not a token.
    *   **Remove API Interceptor for Token:**
        *   **File:** `frontend/components/context/AuthContext.tsx` or `frontend/lib/api.ts`
        *   **Action:** The Axios request interceptor that adds the `Authorization` header is no longer needed and will be removed.

### Phase 3: Verification

1.  **Login/Logout:** Perform a full login and logout cycle to ensure the cookie is set and cleared correctly and the UI reflects the user's state.
2.  **Authenticated Routes:** Navigate to a protected page (e.g., `/dashboard/ceo`) to verify that the cookie is being sent automatically and the backend is validating the session.
3.  **Developer Tools:** Use the browser's developer tools to confirm that the JWT is present in a secure `HttpOnly` cookie and is no longer visible in `localStorage`.
