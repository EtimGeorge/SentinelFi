# Senior Developer Escalation Report: Persistent `db:reset` Failures (Multi-tenancy Provisioning) - V2

**Date:** January 24, 2026

**Reported By:** Gemini AI Agent

---

## 1. Problem Statement

The `npm run db:reset` script, designed to fully reset and provision the development database for our multi-tenant application, is consistently failing during the tenant schema provisioning and migration phase. This prevents local development setup and comprehensive testing of tenant-specific features.

## 2. Current Status of `db:reset` Process

Significant progress has been made, and many initial blockers have been resolved:

*   **Database Recreation:** The script successfully connects to the PostgreSQL admin database, drops the existing `neondb`, and recreates it.
*   **`init.sql` Execution:** The `init.sql` script (containing `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`) executes successfully.
*   **Public Schema Migrations:** All public schema TypeORM migrations run and commit successfully, creating `tenants`, `user`, `audit_log`, `permissions`, `roles`, `role_permissions`, and `user_roles` tables, along with relevant indexes.
*   **Roles and Permissions Seeding:** The `backend/src/database/seeds/seed-roles-permissions.ts` script now executes successfully and rapidly. **(FIXED: Refactored to initialize TypeORM DataSource directly, bypassing full NestJS context startup).**
*   **SuperAdmin Seeding:** The `InitialSuperAdminSeederService` (triggered by `setup-test-tenants.ts` initializing a NestJS context) correctly identifies if a SuperAdmin user exists and creates one if needed. **(FIXED: Graceful fallback added for missing role during initial runs).**
*   **`execSync` Timeout:** General timeouts for nested `ts-node` commands (`npm run typeorm:run`, `seed-roles-permissions.ts`, `setup-test-tenants.ts`) within `db-reset.ts` have been mitigated by switching to `execPromise` with extended timeouts (2-3 minutes). **(FIXED: `child_process.exec` with `util.promisify` and custom `timeout` options implemented).**

## 3. Current Blocking Error (Root Cause)

The `db:reset` process now consistently fails at the point where `setup-test-tenants.ts` attempts to provision the first test tenant (`SOLUTION_ENERGY`):

**Error Message:**
```
ERROR [TenantMigrationService] Failed to run migrations for schema "solution_energy": schema "solution_energy" does not exist
QueryFailedError: schema "solution_energy" does not exist
    at PostgresQueryRunner.query (...)
    ...
    at async TenantMigrationService.runTenantMigrations (C:\temp\SentinelFi\backend\src\database\tenant-migration.service.ts:107:7)
    at async TenantService.createTenant (C:\temp\SentinelFi\backend\src\tenants\tenant.service.ts:83:7)
    at async setupTestTenants (C:\temp\SentinelFi\backend\scripts\setup-test-tenants.ts:44:17)
```

**Context of Failure:**

The error occurs within `TenantService.createTenant`. The sequence of operations is:
1.  `TenantService.createTenant` is called.
2.  An active `queryRunner` is used to start a transaction.
3.  `queryRunner.query(CREATE SCHEMA IF NOT EXISTS "${schema_name}")` is executed.
    *   **Observation:** The logs show `LOG [TenantService] Creating schema: solution_energy`. This implies the `CREATE SCHEMA` command is *sent* to PostgreSQL.
4.  Immediately after, `this.tenantMigrationService.runTenantMigrations(schema_name)` is called.
5.  Inside `TenantMigrationService.runTenantMigrations`, a *new* `TypeORM DataSource` is created for the specific `schemaName`.
6.  `tenantDataSource.initialize()` and `tenantDataSource.runMigrations()` are called.
7.  **This is where the `QueryFailedError: schema "solution_energy" does not exist` occurs.** TypeORM's `MigrationExecutor.createMigrationsTableIfNotExist` (within `runMigrations`) attempts to create the `tenant_migrations` table in `"solution_energy"` schema, but PostgreSQL reports the schema does not exist.

## 4. Detailed Root Cause Analysis (Current Hypothesis)

The problem lies in the timing and visibility of the dynamically created PostgreSQL schema within a transactional context, specifically when a *new* TypeORM `DataSource` instance tries to connect to it.

*   **PostgreSQL Transactional Behavior:** When `CREATE SCHEMA` is executed within a transaction (as it is by `TenantService`'s `queryRunner`), the schema officially becomes visible *only after that transaction is committed*. While the `queryRunner` might "see" it locally, a **new connection or `DataSource` might not see the schema until the creating transaction is fully committed.**
*   **TypeORM `DataSource` Isolation:** `TenantMigrationService` creates a `new DataSource(...)` instance. Even though it's in the same Node.js process, this new `DataSource` establishes its *own connection* or uses a separate connection from the pool. If the `CREATE SCHEMA` transaction is not yet committed when this new `DataSource` attempts to `initialize()` and `runMigrations()`, PostgreSQL correctly reports that the schema does not exist.
*   **Missing Schema Creation Step?** If `TenantService` is intended to create the schema, and `TenantMigrationService` is meant to migrate it, there needs to be a clear boundary where the schema creation is committed *before* migrations are attempted.

## 5. Actions Taken & Outcomes (Relevant to this blocking issue)

*   **Corrected `ManyToOne` syntax for cross-schema relations (`UserEntity`):** Changed `ManyToOne(() => 'UserEntity')` to `ManyToOne('UserEntity')` in `ProjectEntity`, `WbsBudgetEntity`, `OperationalBudgetEntity`. **Outcome:** Resolved TypeScript compilation errors related to `ManyToOne` decorator arguments.
*   **Re-added public entities to `TenantMigrationService` `entities` array:** Explicitly included `UserEntity`, `RoleEntity`, `PermissionEntity`, `TenantEntity`, `AuditLogEntity` in `tenantDataSourceOptions.entities`. **Outcome:** Resolved previous error `Entity metadata for UserEntity#roles was not found`, confirming that TypeORM needed visibility to these public entities for relation metadata resolution, even if they reside in different schemas.

## 6. Proposed Next Steps (for Senior Developer Investigation)

The core issue appears to be related to the atomicity and visibility of `CREATE SCHEMA` within a TypeORM-managed transaction and the subsequent attempt by a separate `DataSource` to utilize that schema immediately.

1.  **Commit `CREATE SCHEMA` Transaction:**
    *   Investigate if the `queryRunner` in `TenantService.createTenant` needs to `commitTransaction()` *immediately after* `CREATE SCHEMA` and *before* `tenantMigrationService.runTenantMigrations` is called. This would commit the schema creation, making it visible to subsequent connections.
    *   **Concern:** Committing early breaks the atomicity of `createTenant` (schema created but tenant record or migrations could still fail). This might require a more sophisticated rollback strategy (e.g., dropping the schema if later steps fail).

2.  **Explicit Schema Creation / Connection Reuse:**
    *   Can `TenantMigrationService` leverage the *same `queryRunner`* from `TenantService` to run migrations? This would avoid the new connection problem. This would mean passing the `queryRunner` or its `DataSource` to `runTenantMigrations`.
    *   Alternatively, `TenantMigrationService` could execute `CREATE SCHEMA` itself *before* `initialize()` and `runMigrations()`, ensuring it has its own explicit connection that performs and commits the schema creation. However, this duplicates logic from `TenantService`.

3.  **TypeORM/PostgreSQL Timing/Visibility:**
    *   Is there a specific TypeORM configuration (`synchronize: true` - which we avoid for migrations, `dropSchema`) or PostgreSQL setting that influences schema visibility in such scenarios?
    *   Could a short `await new Promise(resolve => setTimeout(resolve, 100));` after `CREATE SCHEMA` resolve a race condition (though this is generally an anti-pattern)?

4.  **Review `TenantService` and `TenantMigrationService` Integration:**
    *   Confirm the intended design for how schemas are created and migrated. The current implementation of `TenantService.createTenant` has a `queryRunner` that *creates* the schema, but `TenantMigrationService` then creates a *new* `DataSource` to *migrate* it. This separation, while potentially cleaner, seems to be causing the visibility issue.

**Request for Guidance:**

I require guidance on the most appropriate and robust architectural pattern for ensuring a newly created PostgreSQL schema, within a TypeORM-managed transaction, is immediately accessible for migrations by a dynamically instantiated `DataSource` for that specific schema.

---
End of Report
