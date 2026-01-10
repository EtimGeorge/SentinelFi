# TypeORM Multi-Tenancy Migration Strategy and Manual Cleanup

## Context
This document outlines the strategy for managing database migrations in the SentinelFi multi-tenant application, specifically addressing the interaction between public schema migrations and tenant-specific schema migrations using TypeORM.

## Architecture Overview
The application utilizes a schema-per-tenant multi-tenancy model.
-   **Public Schema**: Contains shared core data (e.g., `tenants`, `user`, `audit_log` tables). Managed by TypeORM migrations (`backend/src/migrations/public/`).
-   **Tenant Schemas**: Each tenant has its own dedicated PostgreSQL schema, containing tenant-specific data (e.g., `project`, `wbs_budget`, `live_expense` tables). Managed by TypeORM migrations (`backend/src/migrations/tenant/`) and provisioned dynamically.

## TypeORM Configuration
-   `backend/ormconfig.public.ts`: Configures TypeORM `DataSource` for the `public` schema, including only public entities. This ensures public migrations (`npm run typeorm:public:generate`) exclusively generate changes for the public schema.
-   `backend/ormconfig.tenant.ts`: Configures TypeORM `DataSource` for a placeholder tenant schema (`client_template`). This `DataSource` **must include all tenant-specific entities AND public entities that are referenced by tenant entities (e.g., `UserEntity`, `TenantEntity`)**. This inclusion of public entities is necessary for TypeORM to correctly resolve relationship metadata for tenant entities during migration generation and application.

## Manual Cleanup Requirement for Tenant Migrations

### The Problem
Due to a known behavior/limitation of TypeORM's `migration:generate` when an `ormconfig`'s `entities` array includes entities that belong to a *different* schema than the `schema` property specified in the `DataSource` (e.g., `ormconfig.tenant.ts` specifies `schema: 'client_template'` but includes `UserEntity` which is `schema: 'public'`), the generated tenant migrations (`npm run typeorm:tenant:generate`) will often **unintentionally include SQL statements that attempt to alter or recreate public schema elements (e.g., `public.user_role_enum` or the `user` table)**.

These public schema alterations *must not* be part of a tenant-specific migration, as tenant migrations should only affect the target tenant's schema. Including them would lead to errors when attempting to apply tenant migrations to a new tenant schema (where these public elements wouldn't exist) or would incorrectly try to modify the core public schema.

### Required Action: Manual Cleanup After Generating Tenant Migrations

Whenever a new tenant migration is generated (e.g., `npm run typeorm:tenant:generate <name>`), a **manual cleanup step is mandatory** before committing and running the migration.

**Steps for Manual Cleanup:**

1.  **Generate the tenant migration**:
    ```bash
    npm run typeorm:tenant:generate backend/src/migrations/tenant/NewTenantFeature
    ```
2.  **Open the newly generated migration file** (e.g., `backend/src/migrations/tenant/TIMESTAMP-NewTenantFeature.ts`).
3.  **Inspect the `up` method**:
    *   Look for any `await queryRunner.query(...)` calls that reference the `public` schema (e.g., `"public"."user_role_enum"`, `"user"`, `"tenants"` tables).
    *   **Remove these problematic queries.** They are typically `ALTER TYPE`, `CREATE TYPE`, `ALTER TABLE`, or `DROP TYPE` statements related to public schema elements.
4.  **Inspect the `down` method**:
    *   Similarly, look for and **remove any corresponding `public` schema alteration queries** from the `down` method. Ensure the `down` method accurately reverses only the tenant-specific changes made in the `up` method.
5.  **Save the cleaned migration file.**
6.  **Commit the cleaned migration file.**

### Example of Code to Remove (from tenant migration's `up` method):

```typescript
// Example of problematic code in a tenant migration's 'up' method to be removed:
await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User')`);
await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
// ... and related queries for dropping/recreating public enums or altering public tables
```

### Justification
This manual cleanup ensures that:
-   Tenant-specific migrations exclusively modify the tenant's schema.
-   The `public` schema remains untouched by tenant migrations.
-   The integrity of the multi-tenancy model is preserved.

### Future Considerations
While this manual step is necessary for now, potential future enhancements could involve:
-   Developing a custom TypeORM CLI wrapper that automatically filters generated migration SQL based on a defined schema mapping, preventing public schema alterations from being written to tenant migration files.
-   Exploring alternative multi-tenancy patterns or TypeORM versions that might offer more granular control over migration generation for mixed-schema environments.
