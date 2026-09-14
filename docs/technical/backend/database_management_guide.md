# Database Management and Structure Guide

## Table of Contents
1.  [Overview](#1-overview)
2.  [Tools and Technologies](#2-tools-and-technologies)
3.  [Database Configuration (`ormconfig.*.ts`)](#3-database-configuration-ormconfigts)
    *   [3.1. `ormconfig.public.ts`](#31-ormconfigpublicts)
    *   [3.2. `ormconfig.tenant.ts`](#32-ormconfigtenantts)
    *   [3.3. `ormconfig.ts` (For `db:reset` and Generic CLI)](#33-ormconfigts-for-dbreset-and-generic-cli)
4.  [Schema Definition and Entities](#4-schema-definition-and-entities)
    *   [4.1. Public Schema Entities](#41-public-schema-entities)
    *   [4.2. Tenant Schema Entities](#42-tenant-schema-entities)
    *   [4.3. Enum Management](#43-enum-management)
5.  [Migration Management](#5-migration-management)
    *   [5.1. General Principles](#51-general-principles)
    *   [5.2. `db:reset` Script](#52-dbreset-script)
    *   [5.3. Public Schema Migrations](#53-public-schema-migrations)
        *   [5.3.1. Generating Public Migrations](#531-generating-public-migrations)
        *   [5.3.2. Running Public Migrations](#532-running-public-migrations)
    *   [5.4. Tenant Schema Migrations](#54-tenant-schema-migrations)
        *   [5.4.1. Generating Tenant Migrations](#541-generating-tenant-migrations)
        *   [5.4.2. **CRITICAL: Manual Cleanup of Tenant Migrations**](#542-critical-manual-cleanup-of-tenant-migrations)
        *   [5.4.3. Running Tenant Migrations (Provisioning)](#543-running-tenant-migrations-provisioning)
    *   [5.5. Role of Runtime Scripts: `provision-tenant-schema.ts` vs. `tenant-database.providers.ts`](#55-role-of-runtime-scripts-provision-tenant-schemats-vs-tenant-databaseprovidersts)
6.  [Adding New Tables/Entities](#6-adding-new-tablesentities)
    *   [6.1. Adding a New Public Schema Entity](#61-adding-a-new-public-schema-entity)
    *   [6.2. Adding a New Tenant Schema Entity](#62-adding-a-new-tenant-schema-entity)
7.  [Future Considerations and Best Practices](#7-future-considerations-and-best-practices)
    *   [7.1. Automated Tenant Schema Evolution](#71-automated-tenant-schema-evolution)
    *   [7.2. Database Seeding](#72-database-seeding)
    *   [7.3. Rollback Strategy](#73-rollback-strategy)
    *   [7.4. Performance Tuning](#74-performance-tuning)

---

## 1. Overview
The SentinelFi application employs a robust multi-tenant architecture utilizing **PostgreSQL schemas** for data isolation. This means each client/tenant operates within its own dedicated PostgreSQL schema, ensuring strict data separation and enhancing security.

-   A shared `public` schema houses core application data (e.g., user accounts, tenant configurations) that is common across all tenants.
-   Tenant schemas are dynamically created and managed, ensuring each tenant's data resides in its own isolated environment.

TypeORM is used as the Object-Relational Mapper (ORM) to define and manage database schemas and migrations.

## 2. Tools and Technologies
*   **Database**: PostgreSQL
*   **ORM**: TypeORM (with `pg` driver)
*   **Language**: TypeScript/Node.js

## 3. Database Configuration (`ormconfig.*.ts`)
TypeORM data source configurations are centrally managed in the `backend/` directory. For granular control over public and tenant schema operations, we use dedicated configuration files.

### 3.1. `ormconfig.public.ts`
This configuration is specifically designed for managing the `public` schema.
*   **Location**: `backend/ormconfig.public.ts`
*   **Purpose**: Used for generating (`npm run typeorm:public:generate`) and running (`npm run typeorm:public:run`) migrations that affect **only** the `public` schema.
*   **`entities`**: Explicitly lists only entities that reside in the `public` schema (e.g., `TenantEntity`, `UserEntity`, `AuditEntity`).
*   **`schema`**: Explicitly set to `'public'`.
*   **`migrationsTableName`**: Set to `'public_migrations'` to track public schema migrations separately.

### 3.2. `ormconfig.tenant.ts`
This configuration is specifically designed for generating migrations that define the structure of **tenant-specific data**. These migrations are then applied dynamically to new tenant schemas during the provisioning process.
*   **Location**: `backend/ormconfig.tenant.ts`
*   **Purpose**: Used for generating (`npm run typeorm:tenant:generate`) and running tenant migrations. These migrations define the structure of **tenant-specific data**.
*   **`entities`**: Lists all tenant-specific entities (e.g., `ProjectEntity`, `WbsBudgetEntity`, `LiveExpenseEntity`, `WbsCategoryEntity`, `OperationalBudgetEntity`, `OperationalBudgetCategoryEntity`, `OperationalExpenseEntity`). **Crucially, it also includes public entities (`UserEntity`, `TenantEntity`) that are referenced by tenant entities via foreign keys.** This inclusion is necessary for TypeORM to correctly build the complete relationship graph and metadata for tenant entities during migration generation.
*   **`schema`**: Explicitly set to `'client_template'`. This acts as a **logical placeholder schema name** within this `ormconfig` file, guiding TypeORM in how to generate migration SQL (e.g., `CREATE TABLE "client_template"."project"`). During actual tenant provisioning, this placeholder will be dynamically replaced by the tenant's specific schema name (e.g., `tenant_abc`).
*   **`migrationsTableName`**: Set to `'tenant_migrations'` to track tenant schema migrations separately within each tenant's schema.

### 3.3. `ormconfig.ts` (For `db:reset` and Generic CLI)
This is a general-purpose TypeORM configuration file used for specific scenarios.
*   **Location**: `backend/ormconfig.ts`
*   **Purpose**: Primarily used by the `db:reset` script for its `npm run typeorm:run` step. It ensures that only necessary public migrations are run when resetting the database. It can also serve as a default `ormconfig` if generic TypeORM CLI commands are invoked without specifying `--d` (though direct usage of `ormconfig.public.ts` or `ormconfig.tenant.ts` is preferred for clarity).
*   **`entities`**: Explicitly lists only entities that reside in the `public` schema (e.g., `TenantEntity`, `UserEntity`, `AuditEntity`). This prevents TypeORM from attempting to process tenant entities in a context where they don't belong.
*   **`schema`**: Explicitly set to `'public'`.
*   **`migrations`**: Explicitly set to `'./src/migrations/public/*.ts'` to ensure only public migrations are discovered and executed by `db:reset`. This prevents errors from tenant migrations trying to run in a non-existent `client_template` schema during a full database reset.

## 4. Schema Definition and Entities
All database tables are defined using TypeORM `Entity` classes. These entities specify table names, columns, data types, relationships, and the schema they belong to.

### 4.1. Public Schema Entities
Entities for the public schema reside in their respective modules within `backend/src/` and are marked with `@Entity({ name: "table_name", schema: "public" })`.
*   **Examples**:
    *   `backend/src/tenants/tenant.entity.ts` (`tenants` table)
    *   `backend/src/auth/user.entity.ts` (`user` table)
    *   `backend/src/audit/audit.entity.ts` (`audit_log` table)
*   **Enums**: Enums used in public entities (e.g., `Role` for `UserEntity`) are defined in `shared/types/role.enum.ts` and are correctly generated by TypeORM migrations for the `public` schema.

### 4.2. Tenant Schema Entities
Entities for tenant-specific schemas reside in their respective modules within `backend/src/` and are marked with `@Entity({ name: "table_name", schema: "client_template" })`. Note that `"client_template"` is a **logical designation** for TypeORM. In a live tenant schema, TypeORM transparently maps this to the actual tenant's schema name (e.g., `tenant_abc`) through dynamic DataSource configuration.
*   **Examples**:
    *   `backend/src/projects/project.entity.ts` (`project` table)
    *   `backend/src/wbs/wbs-budget.entity.ts` (`wbs_budget` table)
    *   `backend/src/wbs/wbs-category.entity.ts` (`wbs_category` table)
    *   `backend/src/wbs/live-expense.entity.ts` (`live_expense` table)
    *   `backend/src/operational-budgets/operational-budget.entity.ts` (`operational_budget` table)
    *   `backend/src/operational-budgets/operational-budget-category.entity.ts` (`operational_budget_category` table)
    *   `backend/src/operational-budgets/operational-expense.entity.ts` (`operational_expense` table)
*   **Enums**: Enums used in tenant entities (e.g., `WbsBudgetStatus` for `WbsBudgetEntity`) are defined in `shared/types/*.enum.ts` or within the entity's module. These are correctly generated by TypeORM migrations for tenant schemas.

### 4.3. Enum Management
All PostgreSQL ENUM types are managed via TypeScript enums integrated with TypeORM entities. This ensures a single source of truth for enum definitions and their corresponding database types. When adding new enum values or new enums, update the TypeScript enum and then generate a new TypeORM migration.

## 5. Migration Management
TypeORM migrations are the primary mechanism for evolving the database schema. They are organized into `public` and `tenant` categories for logical separation.

### 5.1. General Principles
*   **TypeORM as Source of Truth**: All schema changes (new tables, columns, relationships, enums) should originate from modifying TypeORM entities, not directly from raw SQL files (except `init.sql` for extensions).
*   **Separation of Concerns**: Public migrations only affect the `public` schema. Tenant migrations only affect tenant-specific schemas.
*   **Atomic Migrations**: Each migration should ideally represent a single, logical change.

### 5.2. `db:reset` Script
The `db:reset` script is crucial for local development and testing. It provides a clean slate by:
1.  Dropping and recreating the main PostgreSQL database.
2.  Running `backend/src/database/init.sql` (which currently only ensures the `uuid-ossp` extension exists).
3.  Executing **only** the `public` schema TypeORM migrations, using `backend/ormconfig.ts` (which is configured to discover only public migrations). This prevents `db:reset` from attempting to run tenant migrations in a context where tenant schemas do not yet exist.

*   **Usage**: `npm run db:reset`
*   **Caution**: This script is destructive and should **never** be run in a production environment.

### 5.3. Public Schema Migrations
These migrations define and evolve the tables and types within the `public` schema.

#### 5.3.1. Generating Public Migrations
When you modify a public entity (e.g., add a column to `UserEntity`, create a new public entity), follow these steps:
1.  **Modify the relevant entity file(s)** (e.g., `backend/src/auth/user.entity.ts`).
2.  **Generate a new public migration**:
    ```bash
    npm run typeorm:public:generate backend/src/migrations/public/YourMigrationName
    ```
    Replace `YourMigrationName` with a descriptive name (e.g., `AddUserPhoneNumberField`).
3.  **Review the generated migration file**:
    *   Ensure it *only* contains changes for public schema tables and enums.
    *   Verify the `up` and `down` methods correctly apply and revert the intended changes.
4.  **Commit the generated migration file.**

#### 5.3.2. Running Public Migrations
Public migrations are typically run during application deployment or after a `db:reset`.
*   **Usage**: `npm run typeorm:public:run`
*   This command executes all pending migrations defined in `backend/src/migrations/public/` against the `public` schema.

### 5.4. Tenant Schema Migrations
These migrations define and evolve the tables and types intended for tenant-specific schemas.

#### 5.4.1. Generating Tenant Migrations
When you modify a tenant-specific entity (e.g., add a column to `ProjectEntity`, create a new tenant-specific entity), follow these steps:
1.  **Modify the relevant entity file(s)** (e.g., `backend/src/projects/project.entity.ts`).
2.  **Generate a new tenant migration**:
    ```bash
    npm run typeorm:tenant:generate backend/src/migrations/tenant/YourMigrationName
    ```
    Replace `YourMigrationName` with a descriptive name (e.g., `AddProjectBudgetField`).
3.  **Review the generated migration file**:
    *   Ensure it contains changes for your tenant schema tables and enums.
    *   **Proceed to the critical manual cleanup step (5.4.2).**

#### 5.4.2. **CRITICAL: Manual Cleanup of Tenant Migrations**
This step is **mandatory** for every generated tenant migration.

**The Problem**: When `ormconfig.tenant.ts` is used, it needs to load public entities (`UserEntity`, `TenantEntity`) to resolve foreign key relationships with tenant entities. Due to this, TypeORM's `migration:generate` often **unintentionally includes SQL statements that attempt to alter or recreate public schema elements** (e.g., `public.user_role_enum` or the `user` table) within the generated tenant migration. These public schema alterations **must be removed** as tenant migrations should only affect the target tenant's schema.

**Steps for Manual Cleanup:**

1.  **Open the newly generated tenant migration file** (e.g., `backend/src/migrations/tenant/TIMESTAMP-YourMigrationName.ts`).
2.  **Inspect the `up` method**:
    *   Look for any `await queryRunner.query(...)` calls that reference the `public` schema (e.g., `"public"."user_role_enum"`, `"user"`, `"tenants"` tables).
    *   **Remove these problematic queries.** They are typically `ALTER TYPE`, `CREATE TYPE`, `ALTER TABLE`, or `DROP TYPE` statements related to public schema elements.
3.  **Inspect the `down` method**:
    *   Similarly, look for and **remove any corresponding `public` schema alteration queries** from the `down` method. Ensure the `down` method accurately reverses only the tenant-specific changes made in the `up` method.
4.  **Save the cleaned migration file.**
5.  **Commit the cleaned migration file.**

#### 5.4.3. Running Tenant Migrations (Provisioning)
Tenant migrations are applied when a new tenant schema is provisioned. This is handled automatically by the `provision-tenant-schema.ts` script.
*   **Process**:
    1.  A SuperAdmin creates a new tenant via the application's SuperAdmin UI or API.
    2.  The backend's `provision-tenant-schema.ts` script is invoked (typically by the `SuperAdminService`).
    3.  The script first connects to the database and creates a new PostgreSQL schema for the tenant (e.g., `CREATE SCHEMA tenant_abc;`).
    4.  It then initializes a TypeORM `DataSource` configured to target *that specific new tenant schema* (dynamically overriding the `client_template` placeholder from `ormconfig.tenant.ts`).
    5.  Finally, it runs all pending tenant migrations (generated under `backend/src/migrations/tenant/`) against this newly created tenant schema, populating it with the tenant-specific tables and enums.

### 5.5. Role of Runtime Scripts: `provision-tenant-schema.ts` vs. `tenant-database.providers.ts`
These two scripts serve distinct but complementary roles in the multi-tenancy architecture:

*   **`backend/scripts/provision-tenant-schema.ts` (Setup Time)**:
    *   **Purpose**: This is a **one-time setup script** executed *when a new tenant is onboarded* into the system. Its job is to perform the initial database schema creation and population for that new tenant.
    *   **Functionality**: It programmatically connects to the database as an administrative user, creates a new physical PostgreSQL schema (e.g., `tenant_abc`), and then applies all TypeORM tenant-specific migrations to this newly created schema.
    *   **Context**: It operates outside the main application runtime, primarily as an orchestration tool for new tenant initialization.

*   **`backend/src/database/tenant-database.providers.ts` (Application Runtime)**:
    *   **Purpose**: This is a **runtime component** that ensures the main application's backend code interacts with the *correct tenant's schema* for every incoming API request from an authenticated user. It enforces data isolation dynamically.
    *   **Functionality**: For each authenticated request, it identifies the user's `tenant_id`, looks up the corresponding `schema_name` from the `public.tenants` table, and then provides a TypeORM `DataSource` that is explicitly configured to target that specific `schema_name`. All subsequent database operations within that request context are then automatically directed to the correct tenant's data.
    *   **Context**: It operates continuously during the application's runtime, dynamically switching the database context based on the authenticated user.

## 6. Adding New Tables/Entities
Always define new tables as TypeORM entities.

### 6.1. Adding a New Public Schema Entity
1.  **Create a new entity file** (e.g., `backend/src/some_module/new_public_entity.entity.ts`).
2.  **Define the entity class**:
    *   Include `@Entity({ name: "new_public_table", schema: "public" })`.
    *   Define columns, primary keys, relationships.
3.  **Ensure the new entity is included in `backend/ormconfig.public.ts`'s `entities` array.** (It uses `path.resolve(__dirname, 'src/tenants/tenant.entity.ts')`, so you would need to add `path.resolve(__dirname, 'src/some_module/new_public_entity.entity.ts')` or use a glob pattern if you create a dedicated public entities folder).
4.  **Generate a new public migration**: `npm run typeorm:public:generate backend/src/migrations/public/AddNewPublicTable`.
5.  **Review and commit** the generated migration.

### 6.2. Adding a New Tenant Schema Entity
1.  **Create a new entity file** (e.g., `backend/src/some_module/new_tenant_entity.entity.ts`).
2.  **Define the entity class**:
    *   Include `@Entity({ name: "new_tenant_table", schema: "client_template" })`.
    *   Define columns, primary keys, relationships.
    *   If it references a public entity (e.g., `UserEntity`), ensure the FK column is defined and the `ManyToOne` relationship is set up correctly, and that `UserEntity` is included in `ormconfig.tenant.ts`.
3.  **Ensure the new entity is included in `backend/ormconfig.tenant.ts`'s `entities` array.** (It uses `path.resolve(__dirname, 'src/projects/project.entity.ts')`, etc., so you would add the new entity path).
4.  **Generate a new tenant migration**: `npm run typeorm:tenant:generate backend/src/migrations/tenant/AddNewTenantTable`.
5.  **Perform the **CRITICAL manual cleanup** (Section 5.4.2) on the generated migration file.**
6.  **Review and commit** the cleaned migration.

## 7. Future Considerations and Best Practices
### 7.1. Automated Tenant Schema Evolution
As the application evolves, new tenant migrations will be created. The `provision-tenant-schema.ts` script currently runs *all* pending tenant migrations for a new tenant. For existing tenants, a separate mechanism would be needed to apply new tenant migrations. This could involve:
*   A background job that periodically scans for new tenants/migrations and applies them.
*   A SuperAdmin panel feature to trigger schema upgrades for specific tenants.

### 7.2. Database Seeding
Consider developing dedicated seeding scripts for initial data population (e.g., default WBS categories for new tenants, initial SuperAdmin user). These scripts should be separate from migrations.

### 7.3. Rollback Strategy
Ensure you have a clear rollback strategy for failed deployments or migrations. TypeORM's `migration:revert` command can be used, but careful planning is essential, especially in a multi-tenant environment.

### 7.4. Performance Tuning
Regularly monitor database performance. Optimize queries, add indexes, and consider connection pooling for high-load scenarios.