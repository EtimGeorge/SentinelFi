# Comprehensive Codebase Investigation Report: SentinelFi

**Date:** January 10, 2026
**Version:** 2.0
**Status:** Critical Findings & Actionable Plan

---

## 1. Executive Summary

A deep-dive manual investigation of the `SentinelFi` codebase has confirmed that while the conceptual data model is sound, the **application core is currently non-functional in a multi-tenant environment**. Key architectural components (specifically tenancy isolation) are implemented incorrectly, leading to potential data leakage or application failure. Furthermore, critical user journeys (Project Creation, Operational Budgeting) are incomplete or entirely missing from the UI.

**Immediate actions are required** to fix the backend architecture before any new features can be safely added.

---

## 2. Critical Architectural Findings

### 2.1. Broken Multi-Tenancy (Severity: CRITICAL)
The current `TenancyMiddleware` (`backend/src/common/middleware/tenancy.middleware.ts`) is fundamentally flawed.

*   **The Issue:** The middleware creates a *local, isolated* `QueryRunner`, connects it, and sets the `search_path`. However, it **does not** share this configured connection with the rest of the application.
*   **The Consequence:** When a Service (e.g., `ProjectsService`) injects `TENANT_DATA_SOURCE` and uses a Repository (e.g., `this.projectRepository.find()`), TypeORM uses the **default, global connection pool**, which has the default `search_path` (usually `public`).
*   **Result:** All tenant-specific data queries will fail (table not found) or dangerously query the wrong schema. The middleware's effort to set the path is completely ignored by the services.
*   **Fix:** We must implement **ClS-hooked (Continuation Local Storage)** or a similar mechanism to wrap the EntityManager/DataSource context for the duration of the request, ensuring all repositories use the properly configured QueryRunner.

### 2.2. Missing Schema Automations (Severity: HIGH)
The `TenantService` (`backend/src/tenants/tenant.service.ts`) creates a new schema (`CREATE SCHEMA...`) but explicitly **does not run migrations**.

*   **The Issue:** New tenants are created with an empty schema.
*   **The Consequence:** Any attempt to read/write data for a new tenant will fail immediately with "relation does not exist" errors.
*   **Fix:** The tenant creation flow must trigger a programmatic migration run (`dataSource.runMigrations()`) targeting the new schema immediately after creation.

### 2.3. Frontend "Hard Stops" (Severity: HIGH)
*   **Project Creation:** The `/projects` page (`frontend/pages/projects.tsx`) has no UI to create a project, making the module unusable for end-users.
*   **Operational Budgeting:** The backend service (`operational-budgets.service.ts`) lacks logic to log expenses, and the frontend has no UI for it.

---

## 3. Module-Specific Findings

### 3.1. Auth Module
*   **Status:** Generally functional.
*   **Risk:** `login` logic fetches users from the default schema. This is acceptable for a shared `users` table but must be carefully managed if user data needs to be sharded later.
*   **Observation:** The `isSuperAdmin` flag is correctly populated, allowing for role-based logic.

### 3.2. WBS & Projects Module
*   **Status:** Backend logic exists but is unreachable due to the tenancy issue.
*   **State:** The "Rollup" logic (`_addRollupSubqueries`) is present but untested in a real multi-tenant scenario.

### 3.3. Operational Budgets Module
*   **Status:** Backend is a skeleton.
*   **Missing:** No `OperationalExpense` entity, no logic to update `actual_spent`. This module is effectively incomplete.

---

## 4. Recommendations & Next Steps

This report strongly advises against "adding features" until the **Phase 1: Architecture Repair** is complete. Adding features on top of the broken tenancy middleware will only create more technical debt.

**Recommended Roadmap:**

1.  **Fix Tenancy (P0):** Refactor middleware to use `AsyncLocalStorage` (via `nestjs-cls` or similar) to propagate the transactional/schema context to all services.
2.  **Fix Tenant Creation (P0):** Ensure new tenants get their database tables created automatically.
3.  **Complete Projects UI (P1):** Add the "Create Project" wizard.
4.  **Complete Ops Budgeting (P2):** Implement the missing expense logging backend and frontend.

See `implementation-plan-v2.md` for the detailed execution steps.
