# Consolidated Codebase Investigator Report: SentinelFi Project & Budgeting Workflows

**Version:** 1.1
**Date:** January 9, 2026
**Status:** Enriched with PRD & Manual Context

---

## Executive Summary

A deep-dive analysis of the SentinelFi codebase reveals a solid backend database architecture that correctly implements a clear conceptual model for both project-based and operational budgeting, with robust hierarchical data models for WBS and operational entities. However, the application's implementation is **critically incomplete**, particularly in the frontend UI/UX, leading to broken core user journeys and non-functional features. Key architectural weaknesses, security concerns, and production-readiness gaps (especially the complete absence of automated testing) prevent the application from being a cohesive, functional tool. While the foundation is solid, significant work is required to build a functional and secure application on top of it.

---

## 1. Frontend Findings

### 1.1. Placeholders & Incomplete UI / Broken User Journeys

*   **Project Creation & Budgeting Journey is BROKEN:**
    *   The `/projects` page lists existing projects but offers **no "Create Project" button or form**, making it impossible for a user to initiate a new project. (Ref: `PRD Section 3.1` outlines a "New Tenant Self-Service Onboarding Flow" that should include project initiation, and `Manual Guide Section 2` details the budget creation process, which cannot currently be started.)
    *   The `/wbs-manager` page is **misleading**; it functions as a "WBS Category Manager" for editing master `WbsCategoryEntity` templates (as described in `Manual Guide Section 4`), not as a tool for drafting a project's budget as implied by its URL and potential user expectations.
    *   **Conclusion:** There is a fundamental disconnect preventing users from creating projects, establishing `WbsBudgetEntity` hierarchies for specific projects, or logging `LiveExpenseEntity` items against WBS budget entries. The user journey is halted at critical initial steps.
*   **Operational Budgeting Journey is NON-FUNCTIONAL:**
    *   While `OperationalBudgetEntity` exists, the backend `operational-budgets.service.ts` **lacks methods for logging expenses** against these budgets.
    *   The `OperationalBudgetEntity` has an `actual_spent` column, but there's **no backend logic to update it** and no corresponding `OperationalExpenseEntity` to store expense data.
    *   **Conclusion:** The entire operational budgeting flow is non-functional beyond initial budget creation, rendering it useless for its intended purpose of tracking spending (as implied by `PRD Section 2.2`, Tenant Admin needs to manage company's budget).
*   **Placeholder Pages:**
    *   `frontend/pages/approvals.tsx`: Complete placeholder ("Approvals Page") with no logic or UI. (This is a critical missing component for the "Budget Approval" and "Expense Approval Workflows" described in `Manual Guide Sections 2.4 & 4.1`).
    *   `frontend/pages/settings.tsx`: Complete placeholder ("Settings Page") lacking user profile management, notification settings, or any other standard settings functionality. (Refer to `Enhancement Suggestions Section 3.4` for proposed functionality).
    *   `frontend/pages/unauthorized.tsx`: Stylistically basic; could be improved with navigation options.
    *   `frontend/pages/projects.tsx`: Placeholder with just a title, requiring implementation to display project information. The file path is also inconsistent with the `frontend/pages/projects/` directory, suggesting a planned directory structure not fully adopted.
    *   `frontend/pages/wbs-manager.tsx`: Placeholder page requiring implementation beyond just category management, to support WBS budget drafting for projects.
    *   `frontend/pages/reporting/` directory: Empty, indicating a planned but unimplemented reporting feature. (Refer to `Manual Guide Section 5` for intended reporting functionality).
*   **Basic UI/UX:**
    *   `frontend/components/dashboard/SummaryCard.tsx`: The `trend` prop is unused, representing a missed opportunity for data visualization (e.g., icons or color coding).
*   **Navigation Inconsistencies:**
    *   `frontend/lib/navigationMap.ts`: Contains entries for `/approvals` and `/settings` leading to placeholder pages, and commented-out entries for "Teams" and "Reports," indicating unimplemented sections aligned with PRD future phases.

### 1.2. State Management & Logic

*   **`frontend/store/uiStore.ts`**: Defined but unused, suggesting an abandoned or incomplete global UI state management attempt.
*   **Duplicate API Logic:** `frontend/lib/api.js` appears to be a legacy file; `api.ts` is the modern, typed version. The `.js` version should be removed to reduce confusion and maintainability overhead.
*   **Inconsistent API URL Handling:** API calls vary between manual URL construction and using `NEXT_PUBLIC_API_URL`. A single, reusable API client instance (e.g., an Axios instance) is needed for consistency and ease of maintenance (`PRD Section 6.0` - Non-Functional Requirements, emphasizes maintainability).
*   **Minimal Error Handling:** `frontend/pages/_app.tsx` has minimal application-wide error handling. A global error boundary would enhance client-side error management, improving usability as per `PRD Section 6.0`.
*   **No Client-Side Caching/State Synchronization:** Heavy reliance on re-fetching data per page load. Integration of libraries like `TanStack Query` or `SWR` would significantly improve performance and user experience through caching, request de-duplication, and background synchronization, aligning with `PRD Section 6.0` usability goals.

### 1.3. Security & Authentication (Client-Side)

*   **Login Feedback:** `frontend/pages/login.tsx` uses generic "Invalid credentials" messages. While acceptable for security (avoiding username enumeration), client-side validation for basic requirements (e.g., "Password is required") could enhance UX.
*   **Insufficient Client-Side Role Enforcement:** Despite backend guards, the frontend lacks robust logic to prevent users from *seeing* UI elements (links, buttons) for features they cannot access. UI should dynamically adapt based on `AuthContext` roles (e.g., hide `Admin`/`SuperAdmin` links for `User` roles). This is critical for robust RBAC enforcement as outlined in `Manual Guide Section 6.0` and `PRD Section 6.0` (Security).

---

## 2. Backend Findings

### 2.1. Architecture & Business Logic

*   **Core Data Architecture:** The backend correctly implements a clear architectural separation between project-based and operational budgeting. (`Manual Guide Section 1 & 2.1` further elaborate on the intended WBS hierarchy.)
    *   **Project-Based Budgeting:** Robust, hierarchical data model (`ProjectEntity`, `WbsBudgetEntity`, `LiveExpenseEntity`) with `LiveExpenseEntity` correctly linked to `WbsBudgetEntity`. Backend logic for logging expenses and rollup is transactional and solid.
    *   **Operational Budgeting:** `OperationalBudgetEntity` exists as a distinct, standalone entity for time-based budgets, with no database link to project entities.
    *   **WBS Category Templates:** `WbsCategoryEntity` stores a master list of WBS codes/descriptions for templating. (`Manual Guide Section 4` describes their management).
*   **Multi-Tenancy Implementation Gap (Critical Architectural Weakness):**
    *   `TenancyMiddleware` is a good starting point, but its reliance on `req.schema_name` and the manual passing of `clientSchema` through services is fragile.
    *   **Recommendation:** A more robust, request-scoped TypeORM `DataSource` would guarantee automatic and safe data isolation per request, removing the risk of data leakage and simplifying service methods. This is fundamental to meeting `PRD Section 6.0`'s "Data Isolation" non-functional requirement.
*   **WBS Rollup Logic:** `findAllWbsBudgetsWithRollup` in `wbs.service.ts` uses complex raw SQL, bypassing TypeORM's ORM, making it harder to maintain. Its `Promise<any[]>` return type sacrifices type safety. A dedicated DTO for rollup data is needed to improve maintainability and type safety.
*   **AI Agent Integration (`ai-agent/`):** The Python AI agent for WBS data extraction is completely disconnected from the NestJS backend. A `TODO` in `tenant.service.ts` explicitly notes this core unimplemented feature, intended to automate WBS creation.
*   **`operational-budgets` Module Ambiguity:** The business distinction between `operational-budgets` and `wbs_budget` (used in the WBS module) is unclear, and there's no apparent link between them, potentially causing confusion in the overall budgeting strategy.
*   **Notifications (`notifications/`):** The `NotificationsGateway` (WebSockets) is a generic placeholder, not integrated with any business logic (e.g., audit events, budget approvals, tenant creation). This limits real-time user feedback on critical events.

### 2.2. Security & Validation

*   **Loose Typing in Controllers:** Numerous controller methods (`e.g., in `wbs.controller.ts`) use `@Req() req: any`, bypassing TypeScript's type safety. These should be replaced with strongly-typed `AuthenticatedRequest` objects to enhance code robustness and security, as per `PRD Section 6.0` (Security).
*   **DTO Usage Inconsistency:** In the `WBS` module, `updateCategory` in `wbs.controller.ts` incorrectly uses `CreateWbsCategoryDto` instead of a dedicated `UpdateWbsCategoryDto` (with `@IsOptional()` fields). This forces clients to send all fields for updates and may be a pattern elsewhere, hindering API flexibility and potentially leading to validation issues.
*   **Privilege Escalation Potential:** The distinction between `Admin` and `SuperAdmin` roles requires rigorous enforcement. A comprehensive audit of every protected route is needed to prevent `Admin` users from accessing `SuperAdmin`-only functionality. This directly impacts `PRD Section 6.0` (Security) and the defined roles in `PRD Section 2.0` (`SuperAdmin` vs. `Tenant Admin`).
*   **`seed-test-users.service.ts` Security Risk:** This development-only service contains logic to delete users and tenants, posing a significant security risk if accessible in production. It must be strictly disabled or firewalled in production environments.

### 2.3. Placeholders & Incomplete Features

*   **`database/tenant-schema.sql`:** This file is unused (schema created dynamically via `run-init-sql-for-tenant.ts`) and should be removed or repurposed to streamline the codebase.
*   **`search/` module:** Empty, indicating a planned but unstarted global search feature, which is crucial for usability as described in `Enhancement Suggestions Section 3.4`.
*   **Document Export Utilities:** `word.utility.ts` and `excel.utility.ts` in `common/` are empty placeholders, despite `pdf.utility.ts` being implemented, suggesting an incomplete suite of document export features. `Manual Guide Section 5.2` describes the intention for reports to be available for print/download.
*   **Inconsistent Error Handling:** Error handling varies (generic `HttpException` vs. specific exceptions). A more standardized approach using custom exception classes would improve clarity and maintainability, and enhance user feedback.
*   **Sparse Diagnostic Logging:** While the `AuditModule` is a good start for business logic events (as confirmed implemented in `PRD Section 5.0`), general diagnostic logging is sparse. Key business logic events (e.g., role changes, tenant assignments) should have structured logs for auditing and debugging, complementing the existing `AuditLogViewer` (`Manual Guide Section 7.3`).

---

## 3. General & Monorepo Findings

*   **`.env.prod` File Usage:** This file exists in the root but appears unused. While `ormconfig.ts` has logic to load it, primary `.env` files reside in `backend/`, creating confusion and potential configuration discrepancies. Consolidation is needed for clarity.
*   **Duplicate `package.json`:** A redundant `package.json` exists in `backend/backend/`, which appears to be an artifact and should be removed to avoid confusion and maintain repository cleanliness.
*   **Shared Library (`shared/`) Underutilization:** The `role.enum.ts` is well-used, but the `shared/` library could be expanded to include common DTOs, interfaces, and validation schemas, reducing code duplication across frontend and backend, improving code quality and consistency.
*   **Lack of Documentation:** Beyond PRDs, there's a complete absence of architectural documentation, developer setup guides, or API documentation (e.g., using Swagger/OpenAPI, which NestJS supports). This is a critical barrier to developer onboarding and maintainability.
*   **Absence of Automated Testing (Major Production-Readiness Gap):** No unit or end-to-end tests exist. A testing strategy (Jest for unit, Cypress/Playwright for E2E) is critically needed to verify functionality, prevent regressions, and build confidence in refactoring. This is a crucial aspect of `PRD Section 6.0` Non-Functional Requirements for "Scalability" and "Security."
*   **Missing CI/CD Pipeline:** No CI/CD is configured for automated testing, linting, and building, which is essential for a production-grade application to ensure continuous quality and efficient deployment.