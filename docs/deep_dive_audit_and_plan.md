# SentinelFi: Deep Dive Audit & Strategic Plan

## I. Executive Summary

This document outlines the findings of a deep-dive audit of the SentinelFi application. The investigation confirms the application is built on a strong foundation, including a secure NestJS backend, a modern Next.js frontend, and a robust "Schema per Tenant" multi-tenancy architecture.

However, a **critical bug** was identified that completely blocks user authentication, rendering the application unusable. Furthermore, a key component of the multi-tenancy architecture—routing user requests to their specific data schema—is missing and must be implemented.

This plan details the immediate fix for the authentication blocker, a strategy to complete the multi-tenancy implementation, and a roadmap for proactively improving code quality, robustness, and UI/UX in line with the project's goals for a sophisticated and reliable platform.

## II. Critical Issues & Blockers

### C-1: [BUG] 401 Unauthorized on Login

-   **Symptom:** All login attempts fail with a `401 Unauthorized` error.
-   **Root Cause:** A global `AuthGuard` is applied at the controller level in `backend/src/auth/auth.controller.ts`. This guard requires a valid JWT for *all* routes within the controller, including the public-facing `/login` endpoint. This creates a catch-22 where a user cannot log in because they must already be logged in.
-   **Proposed Solution (Advanced Implementation):** Instead of a simple but verbose fix, we will implement a more robust, declarative, and standard NestJS pattern.
    1.  **Create a `@Public()` Decorator:** To explicitly mark routes that do not require authentication.
    2.  **Implement a Custom `JwtAuthGuard`:** This guard will extend the base functionality to recognize and bypass the `@Public()` decorator, making the authentication strategy more flexible and maintainable.
    3.  **Refactor `AuthController`:** Apply the new guard at the controller level and use the `@Public()` decorator on the `login` method.

## III. Architectural Analysis & Opportunities

### A-1: Multi-Tenancy: "Schema per Tenant"

-   **Architecture:** The backend correctly uses a "Schema per Tenant" model, where each tenant's data is isolated in a dedicated PostgreSQL schema. This is an excellent choice for security and data segregation. The `tenant.service.ts` is responsible for creating these schemas when a new tenant is provisioned.
-   **CRITICAL MISSING FEATURE:** The investigation revealed that while schemas are *created*, there is no mechanism to *use* them for incoming user requests. For the multi-tenancy to function, every authenticated API request must be scoped to the correct tenant's schema (e.g., via `SET search_path = 'the_tenant_schema'`).
-   **Proposed Solution:** Implement a global, request-scoped middleware. This middleware will run on every authenticated request, extract the `tenant_id` from the user's JWT, and set the `search_path` for the duration of that request. This is a crucial step to make the multi-tenancy architecture functional.

### A-2: Authentication & Authorization

-   **Password Security:** **CONFIRMED.** The `auth.service.ts` correctly uses `bcrypt` to hash and compare passwords, which is a security best practice.
-   **Session Management:** The use of `HttpOnly` cookies to store the JWT is a secure practice that helps mitigate XSS attacks.
-   **Role-Based Access Control (RBAC):** The `RolesGuard` provides a solid foundation for RBAC. Once the primary `AuthGuard` issue is resolved, this guard will correctly enforce endpoint permissions based on user roles defined in the `@Roles()` decorator.

## IV. Code Quality & Robustness (Areas for Proactive Improvement)

The initial investigation was focused on the critical backend architecture. The following are areas hypothesized to need attention, which will be audited and refactored during implementation.

-   **Q-1: Inconsistent DTOs:** There is a high probability that `Create...Dto` objects are being reused for update operations. This can lead to validation errors and security vulnerabilities. The standard practice is to use dedicated `Update...Dto` objects with partial validation (`@IsOptional` or `PartialType`).
-   **Q-2: Loose Typing & Error Handling:** A full audit is needed to identify and eliminate the use of `any` type, which compromises type safety. Error handling should also be reviewed to ensure consistent use of NestJS's built-in exception types (e.g., `NotFoundException`, `ForbiddenException`).

## V. Frontend & UI/UX (Pending Full Review)

A deep frontend audit was not performed due to the critical backend blocker.

-   **User Mandate:** A more polished, professional UI is required, with consistent spacing, borders, and margins to create a clear visual hierarchy.
-   **Proposed Action:** Once the login is functional, a dedicated effort will be made to:
    1.  Define a design system in `tailwind.config.js`.
    2.  Document layout standards.
    3.  Refactor core UI components to adhere to these standards.

## VI. Proposed Strategic Action Plan

The following phased approach will be executed to address all findings:

1.  **Phase 1: Unblock Authentication (Backend)**
    -   Implement the `@Public()` decorator.
    -   Create and apply the custom `JwtAuthGuard`.
    -   Verify that the login flow is successful.

2.  **Phase 2: Enable Multi-Tenancy (Backend)**
    -   Implement the request-scoped middleware to set the PostgreSQL `search_path` based on the user's JWT.
    -   Test to ensure API endpoints are correctly interacting with tenant-specific data.

3.  **Phase 3: Proactive Code Audit & Refactor (Backend)**
    -   Beginning with the `wbs` module, audit and refactor DTOs, type safety, and error handling.
    -   Expand this audit to the `tenants` and `auth` modules.

4.  **Phase 4: UI/UX Polish (Frontend)**
    -   Define and document a consistent design system and layout standards.
    -   Refactor key pages and components to apply the new styling.

This plan prioritizes fixing the critical blocker, completing the core architecture, and then systematically improving code quality and user experience.
