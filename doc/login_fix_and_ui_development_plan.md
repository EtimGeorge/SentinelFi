# SentinelFi: Backend Fix and Frontend Development Plan

## 1. Executive Summary

This report details the successful resolution of the critical authentication bug and outlines a strategic plan for the continued development of the SentinelFi frontend.

The primary backend issue, a "double-hashing" bug, was identified and corrected by refactoring the authentication service to centralize password hashing. This has resulted in a stable and secure login process.

With the backend stabilized, a thorough review of the frontend codebase was conducted. The review found a solid architectural foundation but an incomplete user interface, with some pages being partially implemented placeholders. This report provides a multi-phase, actionable plan to build out the UI, starting with refining existing elements and then developing the core dashboard and financial workflow features as specified in the project's architectural blueprint.

## 2. Analysis of the Critical Login Failure (Retrospective)

The initial and most critical issue was a persistent login failure, where valid credentials were being rejected.

### 2.1. The Root Cause: The "Double-Hashing" Bug

The core problem was a classic anti-pattern in the backend's authentication logic. The `UserEntity` contained a TypeORM `@BeforeInsert` hook that was designed to automatically hash a user's password before saving it to the database.

Simultaneously, the `AuthService`'s `registerTestUser` method was *also* attempting to manually trigger this hashing logic before calling the save operation. This created a race condition where a password would be hashed once manually, and then the *already-hashed* string would be hashed *a second time* by the `@BeforeInsert` hook.

When a user tried to log in, the system was comparing their plaintext password against a double-hashed, and therefore incorrect, value, leading to the `bcrypt.compare` failure.

### 2.2. The Solution: Centralized and Explicit Hashing

To resolve this, I implemented a robust and maintainable solution by adhering to the principle of "fat service, thin entity."

1.  **Logic Centralization:** All password handling logic was moved out of the `UserEntity` and centralized within the `AuthService`. This makes the authentication flow explicit and removes the "magic" of the background hook, which was the source of the bug.
2.  **Entity Simplification:** The `UserEntity` was stripped of all hashing and validation methods, turning it into a pure data-transfer object. This clarifies its role and prevents future side-effects.
3.  **Code Clarity:** In `AuthService`, the property `password_hash` was consistently used to refer to the hashed password, making the code self-documenting and reducing ambiguity. The `registerTestUser` method now explicitly hashes the incoming `plainPassword` before saving it, and the `login` method compares the login password against the `password_hash` field.

The files modified were `backend/src/auth/auth.service.ts` and `backend/src/auth/user.entity.ts`. This approach has definitively resolved the authentication issue.

## 3. Frontend UI/UX Status Review

A file-by-file review of the `frontend` directory and project documentation (`doc/frontend_architecture_bluerint.md`) was conducted to assess the current UI status.

### 3.1. Current State Analysis

*   **Foundation:** The project has a strong foundation with a global `AuthProvider` for state management, a `SecuredLayout` for protecting routes, and a well-defined brand color palette in `frontend/styles/globals.css`.
*   **Login Page (`/login`):** The login page is fully functional and styled. The logo is present but uses fixed sizing (`w-20 h-20`), which may be the cause of perceived layout issues.
*   **Navigation (`LayoutNav.tsx`):** The top navigation bar is functional, correctly displays links based on user roles, and includes a smaller version of the logo (`w-8 h-8`). This inconsistency in logo sizing likely contributes to the unpolished feel.
*   **CEO Dashboard (`/dashboard/ceo`):** This page is **partially implemented**. It successfully fetches real-time financial data from the `/api/v1/wbs/budget/rollup` endpoint and displays key KPIs in cards. However, the page is missing its main data visualization components (a WBS hierarchy tree and a spending chart), which are currently shown as placeholder boxes.
*   **Missing Pages:** The core application pages outlined in the blueprint—`/expense/tracker`, `/budget/draft`, and `/reporting/variance`—have not yet been created. The `/` (index) route is also missing.

## 4. Actionable UI Development Plan

This plan will build upon the existing foundation to complete the UI as envisioned in the architectural blueprint.

### Phase 1: Foundational UI Cleanup and Refinement

This phase addresses the immediate visual inconsistencies.

1.  **Create a Centralized Logo Component:**
    *   **Action:** Create a new component `components/common/Logo.tsx`. This component will render the SentinelFi logo using the Next.js `<Image>` tag for optimized loading and allow for a `size` prop to be passed.
    *   **Goal:** Enforce brand consistency and easily manage the logo across the application.
2.  **Update Logo Usage:**
    *   **Action:** Replace the `<img>` tags in `pages/login.tsx` and `components/Layout/LayoutNav.tsx` with the new `<Logo>` component, providing appropriate sizes.
    *   **Goal:** Fix the inconsistent logo sizing and improve maintainability.
3.  **Create Index Redirect Page:**
    *   **Action:** Create the `pages/index.tsx` file. This page will be responsible for redirecting authenticated users to their appropriate dashboard (`/dashboard/ceo`) and unauthenticated users to the `/login` page.
    *   **Goal:** Create a proper application entry point.

### Phase 2: Complete the CEO Dashboard

This phase will transform the CEO dashboard from a partial view into a complete, data-rich interface.

1.  **Build the `WBSHierarchyTree` Component:**
    *   **Action:** Create a new component at `components/dashboard/WBSHierarchyTree.tsx`. This component will take the `rollup` data as a prop and render it as a nested list or table to display the parent-child relationships of the WBS codes and their budgeted vs. actual costs.
    *   **Goal:** Fulfill a primary requirement of the dashboard blueprint by visualizing the cost structure.
2.  **Integrate a Charting Library:**
    *   **Action:** Install a charting library (e.g., `recharts`). Create a new component `components/dashboard/SpendingChart.tsx`. This component will process the `rollup` data to display a bar chart comparing "WBS Level 1 Spending vs. Budget."
    *   **Goal:** Provide at-a-glance visual analysis of budget performance.
3.  **Update CEO Dashboard Page:**
    *   **Action:** Modify `pages/dashboard/ceo.tsx` to replace the current placeholder `div`s with the new `WBSHierarchyTree` and `SpendingChart` components, passing the fetched data to them.
    *   **Goal:** Deliver the first fully-featured page of the application.

### Phase 3: Build Core Financial Workflow Pages (Future Work)

Once the dashboard is complete, development will proceed to the other core application workflows.

1.  **Expense Tracker Page (`/pages/expense/tracker.tsx`):** Create the high-efficiency form for submitting live expenses against WBS codes.
2.  **Budget Drafting Page (`/pages/budget/draft.tsx`):** Build the interface for creating and managing WBS budget line items.

By following this phased approach, we can systematically evolve the SentinelFi frontend from its current state into a polished, data-driven, and fully functional financial control application.