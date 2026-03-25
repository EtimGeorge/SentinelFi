# Database Management & Operations

SentinelFi's data layer is designed for high-concurrency multi-tenancy. This guide covers the operational procedures for managing migrations and ensuring data consistency.

## 1. Schema Architecture Registry

SentinelFi recognizes two distinct schema types. Operations must ALWAYS target the correct context.

| Schema Type | Context | Migration Table | Tables Included |
| :--- | :--- | :--- | :--- |
| **Global** | `public` | `migrations` | Users, Tenants, RBAC, Master Audit |
| **Tenant** | `[tenant_name]` | `tenant_migrations` | Expenses, Budgets, Projects, OPEX |

## 2. Migration Protocols

### A. Global Schema Changes
To update the master database (public schema):
1.  **Generate**: `npm run typeorm:generate -- InitialSchemaFix`
2.  **Review**: Check `backend/src/migrations/public/`
3.  **Run**: `npm run typeorm:run`

### B. Tenant Schema Changes
To update all existing tenant schemas simultaneously:
1.  **Generate**: Generate a migration in `backend/src/migrations/tenant/`.
2.  **Sync**: Use the `TenantMigrationService` orchestrator:
    ```bash
    # (Planned CLI Tool)
    npm run migrations:sync-tenants
    ```
3.  **Note**: New tenants automatically receive all migrations from the `tenant` folder during the onboarding process.

## 3. Database Lifecycle Management

### 🔄 Schema Cleanup
If a tenant creation fails halfway, the system may leave an "orphaned schema."
*   **Manual Purge**: `DROP SCHEMA "schema_name" CASCADE;`
*   **Safety**: The `TenantService.dropTenantSchema()` utility handles this robustly with a recursion guard.

### 🛡️ Resilience & Recoverability
*   **Neon Backups**: We leverage Neon's native branching for instant non-destructive testing.
*   **TypeORM Guard**: `TenancyAwareDataSource` implements a **Retry Mechanism** for aborted transactions. If a connection is stalled by a previous failed query, the driver issues a `ROLLBACK` automatically before re-setting the `search_path`.

## 4. Operational Best Practices
*   **Never** use `synchronize: true` in production.
*   **Always** encode database credentials in the `DATABASE_URL` (especially if they contain special characters like `@` or `#`).
*   **Audit** the `tenant_migrations` table inside a specific schema to troubleshoot a failing tenant:
    ```sql
    SELECT * FROM "tenant_a".tenant_migrations ORDER BY id DESC;
    ```

---
*Excellence in financial engineering.*
