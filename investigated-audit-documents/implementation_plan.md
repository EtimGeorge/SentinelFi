# Upgrade Implementation Plan: SentinelFi

**Context**: This plan is based on the [Audit Report](audit_report.md) findings.
**Objective**: Hardening security, streamlining multi-tenancy, and adding advanced financial monitoring.

---

## Phase 1: Infrastructure & Shared Cleanup
1. **Action**: Purge build artifacts from `shared/`.
   - `shared/.gitignore`: Add `dist/`, `**/*.js`, `**/*.d.ts`, `**/*.js.map`.
   - Update `shared/package.json` build script to `rimraf dist && tsc`.
2. **Action**: Standardize `tsconfig` paths across monorepo to ensure `@shared/*` always points to the source or build output consistently.

---

### 2. Backend Architecture - Multi-Tenancy & Security
Consolidate provisioning and secure dynamic queries.

#### [STABILIZE] Auth & Tenancy Lifecycle
- Implement `@Public()` decorator and `JwtAuthGuard` to explicitly allow public routes to bypass tenancy checks.
- Refactor `TenancyMiddleware` to handle null contexts gracefully without triggering repository lookups for non-authenticated routes.

#### [MODIFY] [tenant.service.ts](file:///c:/temp/SentinelFi/backend/src/tenants/tenant.service.ts)
- Consolidate logic from `TenantProvisioningService` into `TenantService` to reduce redundancy.
- Implement robust `DROP SCHEMA` logic with safety checks.

#### [MODIFY] [wbs.service.ts](file:///c:/temp/SentinelFi/backend/src/wbs/wbs.service.ts)
- Refactor `getWbsBudgetRollup` to use TypeORM's `query` with actual parameter arrays.
- **Strict Typing**: Replace `@Req() req: any` with `AuthenticatedRequest` across all WBS controllers.
- **DTO Update**: Create and implement `UpdateWbsCategoryDto` and specific return interfaces for rollups.

---

## Phase 4: Advanced Domain Logic
1. **Provisioning**: Update `BudgetControlService` to accept a `ProjectContext`.
   - Add `CommittedCost` calculation: `total_cost_actual + total_committed_lpos`.
2. **Impersonation**:
   - `POST /auth/impersonate/:userId`: Allowed only for `Role.SuperAdmin`.
   - Generates a JWT with `impersonator_id` and the target user's `id` and `tenant_id`.
   - Frontend `AuthContext` must recognize `impersonator_id` to show a "Viewing as..." banner.

---

## Phase 5: Verification (Bulletproofing)
1. **Type Check**: `npm run typecheck-all` must pass across all three workspaces.
2. **Pen-Test**: Manual attempt to bypass `search_path` using SQL injection in WBS filters.
3. **Load Test**: Verify `TenancyAwareDataSource` performance under concurrent requests for different schemas.
