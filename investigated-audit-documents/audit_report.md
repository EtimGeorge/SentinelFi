# Deep Investigation Audit Report: SentinelFi Monorepo

**Date:** January 21, 2026
**Target:** SentinelFi Financial Management System
**Focus:** Architecture, Multi-Tenancy, Security, Type Safety, and Scalability.

---

## 1. Executive Summary
SentinelFi is a sophisticated financial management application built on a monorepo architecture (Next.js frontend, NestJS backend, Shared TypeScript types). The application employs a "Database-per-Tenant" schema-based multi-tenancy model using PostgreSQL schemas on an external Neon instance. 

While the core architecture is robust, the audit identified several critical security vulnerabilities (manual SQL construction), architectural redundancies (multi-layered provisioning), and build management issues (shared types pollution).

---

## 2. Shared Types & Monorepo Structure
### Findings:
- **Build Pollution**: The `shared` folder contains compiled `.js` and `.d.ts` files committed to version control. This leads to inconsistency between the source `.ts` and build output across different environments.
- **Type Propagation**: Types are well-defined but inconsistent in-service application. For example, `AuthContext` on the frontend includes manual redefinitions of `SimpleRole` that should be strictly imported from `@shared`.
- **Enum Consistency**: `Role` and `VarianceFlag` enums are correctly centralized but occasionally bypassed for `any` types in controller methods.

### Recommendation:
- Strict `.gitignore` for `shared/dist` and compiled outputs.
- Enforce `Shared` library as the single source of truth for all DTOs and Enums.

---

## 3. Backend Architecture: Multi-Tenancy & Security
### Findings:
- **Middleware Lifecycle Risk**: The current `TenancyMiddleware` attempts to resolve tenant context for *all* routes. This causes dependency injection failures or fatal errors on public routes (`/login`, `/register`) where no JWT/Tenant context exists. This is the root cause of the observed "socket hang up" and 500 errors during authentication.
- **Schema Resolution**: The `TenancyMiddleware` + `TenancyAwareDataSource` (CLS-based) approach is correctly intended for transparent schema switching, but the execution is coupled too early in the request lifecycle.
- **SQL Injection Risk**: The `WbsService.getWbsBudgetRollup` method implements a Recursive CTE using string concatenation/replacement for date filters. This is a **HIGH** severity risk.
- **Provisioning Redundancy**: Both `TenantService` and `TenantProvisioningService` contain logic for schema creation. `TenantService` handles the transaction but delegates to `TenantProvisioningService` in some flows, while duplicating `CREATE SCHEMA` in others.
- **Audit Logging**: The `AuditService` is well-integrated but uses "fire-and-forget" async calls without explicit error tracking in the main execution thread.

### Recommendation:
- Consolidate provisioning into a single service using a "Provisioning Strategy" pattern.
- Migrating Recursive CTEs to TypeORM `query` calls with actual parameter arrays (`$1`, `$2`).

---

## 4. Frontend Resilience
### Findings:
- **Auth Flow Integrity**: Redirection logic is centralized in `AuthProvider`, which is good. However, the `ProtectedRoute` components (if used) need to be audited for race conditions during initialization.
- **API Wrapper Robustness**: `lib/api.ts` implements advanced retry and deduplication logic, which is high-quality. However, it lacks explicit handling for tenant-specific headers if a requirement for header-based routing is added in the future.
- **State Management**: Using `Zustand` and `AuthContext` provides a clean separation, but the dependency on `js-cookie` for auth tokens requires strict CSRF/SameSite cookie policy enforcement on the backend.

---

## 5. Domain-Specific Business Logic (WBS & Budgeting)
### Findings:
- **Variance Detection**: The `BudgetControlService` is basic. It checks for overruns but doesn't factor in "Committed Costs" (unpaid LPOs).
- **Inconsistent DTO Coverage**: The WBS module heavily relies on `Create...` DTOs for update operations and lacks strict return typing, leading to `Promise<any[]>` leakages in the public API.
- **AI Integration**: The `AiController` proxies requests to a FastAPI agent. The lack of a local schema validation step *before* sending to the AI results in the AI potentially generating invalid WBS structures that fail on insertion.

### Recommendation:
- Implement a "Pre-processing Validator" in the `AiController`.
- Expand `BudgetControlService` to include weighted variance thresholds.
