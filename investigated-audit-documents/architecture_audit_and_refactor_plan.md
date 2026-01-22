# SentinelFi: Consolidated Architectural Audit & Implementation Roadmap V2

## 1. Introduction

This document is the master roadmap for enhancing the SentinelFi project. It synthesizes findings from multiple analyses to create a single, comprehensive plan. It moves us from reactive bug-fixing to proactive, architecture-driven development, prioritizing security and stability as the foundation for future growth.

This plan embodies the "constructive sparring partner" methodology. It is a "bulletproof" strategy to harden and improve the application.

## 2. Consolidated Findings & Risks

A unified analysis has revealed the following critical issues, prioritized by severity:

*   **[High] Critical SQL Injection Vulnerability:** A new finding shows that the `WbsService.getWbsBudgetRollup` method uses raw string concatenation to build a recursive CTE. This exposes the application to a severe SQL injection risk. **This is the highest priority issue to be fixed.**

*   **[High] Architectural Flaw in Middleware:** Both analyses agree: The root cause of the `500 Internal Server Error` and `socket hang up` during login is a global `TenancyMiddleware` incorrectly running on public routes. This causes a fatal dependency injection failure within NestJS.

*   **[Medium] Incomplete Multi-Tenancy Routing:** While the architecture is in place, the mechanism to route requests to the correct tenant schema is not fully implemented. The application identifies a user's tenant but doesn't instruct the database to use that tenant's schema for subsequent queries (`SET search_path`).

*   **[Medium] Monorepo Hygiene Issues:** The `shared` workspace contains committed build artifacts (`.js`, `.d.ts`), leading to potential inconsistencies between environments. This "build pollution" must be resolved.

*   **[Low] Inconsistent Code Quality & Redundancy:**
    *   **DTOs & Typing:** Widespread use of `Create...` DTOs for update operations, loose typing (`any`), and generic return types (`Promise<any[]>`) reduce type safety.
    *   **Provisioning Logic:** Tenant schema provisioning logic is duplicated across `TenantService` and `TenantProvisioningService`, violating the Single Responsibility Principle.

## 3. Phased Implementation Plan

This plan is broken down into distinct, trackable phases. Each phase builds upon the last.

---

### [ ] Phase 0: Monorepo Hygiene & Housekeeping

*Goal: Establish a clean and reliable build process across the monorepo.*

*   [ ] **Action 0.1: Clean Shared Workspace**
    *   [ ] Add `dist/`, `**/*.js`, `**/*.d.ts`, and `**/*.js.map` to `shared/.gitignore`.
    *   [ ] Manually purge all existing build artifacts from the `shared` directory.
    *   [ ] Ensure `shared/package.json` has a clean build script (e.g., `rimraf dist && tsc`).
*   [ ] **Action 0.2: Standardize `tsconfig` Paths**
    *   [ ] Audit all `tsconfig.json` files (`/`, `backend/`, `frontend/`, `shared/`) to ensure the `@shared/*` path alias consistently points to the single source of truth.

---

### [ ] Phase 1: Patch Critical Security & Stability Holes

*Goal: Resolve the most severe security and stability issues to make the application safe and usable.*

*   [ ] **Sub-Phase 1.1: Patch Critical SQL Injection Vulnerability**
    *   [ ] **Immediately** refactor the `WbsService.getWbsBudgetRollup` method.
    *   [ ] Replace the raw string concatenation with a parameterized query using TypeORM's `queryBuilder` or the `.query()` method with a parameter array (`$1`, `$2`). This eliminates the injection vector.

*   [ ] **Sub-Phase 1.2: Stabilize Authentication & Tenancy Lifecycle**
    *   [ ] Create a `@Public()` decorator in `backend/src/common/decorators/public.decorator.ts`.
    *   [ ] Create and globally apply a `JwtAuthGuard` that validates the JWT on all requests *unless* the `@Public()` decorator is present.
    *   [ ] Apply the `@Public()` decorator to all relevant public endpoints in `auth.controller.ts`.
    *   [ ] Decommission and delete the old, globally-applied `TenancyMiddleware`.

*   [ ] **Sub-Phase 1.3: Implement Robust Multi-Tenancy Request Routing**
    *   [ ] Implement a new `TenancyMiddleware` that runs *after* the `JwtAuthGuard`.
    *   [ ] This middleware will extract the `tenant_id` from the authenticated user (`req.user`).
    *   [ ] **Crucially**, it will then execute a query to set the database context for the current transaction: `SET search_path = '<tenant_schema_name>'`. This completes the multi-tenancy architecture.

---

### [ ] Phase 2: Architectural Refactoring

*Goal: Address the identified code quality issues to improve maintainability and enforce consistency.*

*   [ ] **Sub-Phase 2.1: Consolidate Tenant Provisioning**
    *   [ ] Move all unique schema provisioning logic from `TenantProvisioningService` into `TenantService`.
    *   [ ] Refactor `TenantService` to be the single source of truth for a tenant's lifecycle.
    *   [ ] Delete the redundant `backend/src/tenants/provision-tenant.service.ts` file.

*   [ ] **Sub-Phase 2.2: Harden WBS Module**
    *   [ ] Refactor all `wbs.controller.ts` methods to use a strongly-typed `AuthenticatedRequest` object instead of `@Req() req: any`.
    *   [ ] Create and implement a dedicated `UpdateWbsCategoryDto` (using `PartialType`) for update operations.
    *   [ ] Define and use specific DTOs for the return types of all rollup/aggregation methods, eliminating `Promise<any[]>`.

---

### [ ] Phase 3: Advanced Features & Domain Logic

*Goal: Implement high-value, robust features on the newly stabilized platform.*

*   [ ] **Sub-Phase 3.1: Audited Support Impersonation**
    *   [ ] **Backend:** Create a secure, `SuperAdmin`-only endpoint to generate a short-lived impersonation JWT. This JWT should contain `impersonator_id`, target user `id`, and `tenant_id`.
    *   [ ] **Auditing:** Rigorously log the start and end of every impersonation event in the `audit_log` table.
    *   [ ] **Frontend:** The `AuthContext` must recognize the `impersonator_id` in the JWT and trigger a persistent UI banner (e.g., "You are viewing as User X").

*   [ ] **Sub-Phase 3.2: Enhance Budget Variance Controls**
    *   [ ] Modify the `BudgetControlService` to understand the concept of "Committed Costs."
    *   [ ] Update variance calculations to be `(actual_spend + committed_cost) / budget`.
    *   [ ] This provides more accurate, real-time project financial health.

---

### [ ] Phase 4: Verification & Bulletproofing

*Goal: Systematically verify that all fixes and enhancements are working correctly and have not introduced regressions.*

*   [ ] **Action 4.1: Full Type Check**
    *   [ ] A `npm run typecheck --workspaces` command must pass with zero errors.
*   [ ] **Action 4.2: Manual Pen-Testing**
    *   [ ] After Phase 1.1 is complete, manually attempt to exploit the previously identified SQL Injection vector in the WBS filters to confirm the patch is effective.
*   [ ] **Action 4.3: End-to-End Test**
    *   [ ] Perform a full login-to-dashboard flow as a tenant user to confirm that authentication, tenancy routing (`search_path`), and data display are all working correctly.

