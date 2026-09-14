# ARCH-002: Multi-Tenancy & Database Architecture

SentinelFi uses a **Pool-per-Instance, Schema-per-Tenant** architecture. This provides the highest level of data isolation without the overhead of maintaining separate physical database servers for every client.

## 1. Schema-Based Isolation

Data is partitioned into two distinct logical layers within a single PostgreSQL database:

### A. Public Schema (Global)
Contains cross-tenant metadata and system-wide entities:
*   `tenants`: Registered organizations and their settings.
*   `users`: Global identity registry.
*   `roles` / `permissions`: RBAC definitions.
*   `audit_logs`: Global system activity.

### B. Tenant Schemas (Isolated)
Each tenant (e.g., `tenant_a`, `tenant_b`) has its own schema containing:
*   `projects`: Capex/Opex project definitions.
*   `wbs_budgets`: Work Breakdown Structure.
*   `live_expenses`: Real-time ledger entries.
*   `operational_budgets`: OPEX ledgers.

## 2. Dynamic Tenancy Resolution

The application resolves the tenant context on every request without requiring the developer to manually pass `tenantId` to every service.

*   **Async Local Storage (CLS)**: We use `nestjs-cls` to store the `SCHEMA_NAME` in the request's execution context.
*   **TenancyAwareDataSource**: A custom TypeORM `DataSource` wrapper that overrides `createQueryRunner`. Upon connection, it automatically executes:
    ```sql
    SET search_path TO "tenant_schema_name", public;
    ```
*   **Recursion Guard**: Detailed retry logic in `TenancyAwareDataSource` handles aborted transactions by issuing a `ROLLBACK` and re-setting the `search_path`.

## 3. Migration Orchestration

Managing schema updates across 100+ tenant schemas is complex. SentinelFi uses a custom **TenantMigrationService**.

*   **Execution**: Triggered automatically during tenant creation or via a CLI script for bulk updates.
*   **Isolation**: Each migration run creates a dedicated, short-lived `DataSource` pointing specifically to the target schema.
*   **Table Registry**: The `tenant_migrations` table exists inside **each** tenant schema to track individual migration state.

## 4. Neon Integration (Scaling Tip)

Since we are hosted on **Neon**, we must be mindful of connection limits.
*   **Pooling**: `AppModule` limits the global pool to 5-10 connections.
*   **Caching**: `search_path` switches are kept minimal; TypeORM's query runner reuse is encouraged.

---
*Precision. Resilience. Intelligence. SentinelFi.*
