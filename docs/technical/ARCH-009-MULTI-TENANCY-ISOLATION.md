# ARCH-009: Multi-Tenancy Isolation Model

## Status

Accepted

## Context

SentinelFi's original tenancy design (ARCH-002) uses **schema-per-tenant** PostgreSQL with `search_path` routing via `TenancyAwareDataSource`. This provides strong physical isolation for tenant-schema tables. However, a 2026 audit identified two classes of risk:

1. **Shared public-schema tables** (`audit_log`, `email_log`) physically mix rows from all tenants. Application-level `WHERE` clauses are the only barrier against cross-tenant leaks — a single regression in any service would surface another tenant's audit or email data.

2. **Missing `tenant_id` on two entities** (`OperationalBudgetPeriodAllocationEntity`, `ConversationMemberEntity`) that live in tenant schemas — these were relying solely on the implicit relationship through their parent entity and lacked an explicit tenant column for defense-in-depth.

Additionally, no composite indexes existed for the dominant access patterns (approval inbox, P2P lists, trial balance), forcing sequential scans within each tenant schema.

## Decision

### Three-Layer Isolation Model

| Layer | Scope | Mechanism |
|-------|-------|-----------|
| **Primary** | Tenant-schema tables | Schema-per-tenant via `search_path` (existing, unchanged) |
| **Defense-in-depth** | Shared public tables (`audit_log`, `email_log`) | Row-Level Security + `FORCE ROW LEVEL SECURITY` |
| **Application** | All queries | `tenant_id` WHERE clauses in services + `@TenantId()` param decorator |

### RLS Implementation

- **Session variable**: `TenancyAwareDataSource.connect()` sets `app.current_tenant_id` on every connection. Tenant UUID for tenant requests; literal `'SYS'` for SuperAdmin / background / public contexts.
- **Policies**: `USING` + `WITH CHECK` predicate evaluates `current_setting('app.current_tenant_id')` against each row's tenant column.
- **Table owner bypass**: Eliminated via `FORCE ROW LEVEL SECURITY` — without this, RLS is decorative for the app role that owns the tables.
- **Migration safety**: Policies use `COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS')` so tooling, migrations, and pool connections that never call the app's DataSource still resolve to `'SYS'` (full access).

### RLS Scope — What Gets Policies

| Table | RLS | Rationale |
|-------|-----|-----------|
| `audit_log` | YES | Mixed tenant rows, read by tenant admins |
| `email_log` | YES | Mixed tenant rows, filtered by tenant |
| `user` | NO | Shared by design — login flow queries before auth context; SuperAdmin impersonation needs cross-tenant access; all services inject explicit `tenant_id` WHERE |
| `tenant` | NO | Platform metadata, read by SuperAdmin + TenancyGuard |
| `subscriptions` / `billing_invoices` | NO | Platform-managed, not read by tenant users in normal flows |
| All tenant-schema tables | NO | Already isolated by schema boundary |

### Composite Index Migration

Hot-path queries received tenant-scoped composite indexes:

**Tenant schemas** (`1777000000001-AddTenantCompositeIndexes.ts`):
- `budget_ledger(tenant_id, fiscal_period_id, cost_center_id, gl_account_id)` — trial balance rollups
- `p2p_requisition(tenant_id, status, created_at)` — approval inbox
- `p2p_requisition(tenant_id, requester_id, created_at)` — my requisitions
- `p2p_purchase_order(tenant_id, requisition_id, created_at)` — PO lookup
- `p2p_invoice(tenant_id, purchase_order_id, created_at)` — invoice lookup
- `approval_log(tenant_id, document_type, status, created_at)` — approval inbox
- `operational_budget(tenant_id, status, start_date, end_date)` — active budget window
- `operational_expense(tenant_id, operational_budget_category_id, expense_date)` — category analytics

**Public schema** (`1777000000000-AddPublicCompositeIndexes.ts`):
- `audit_log(tenantId, actionType, timestamp)` — tenant activity feed
- `audit_log(tenantId, userId, timestamp)` — user audit trail
- `email_log(tenant_id, status, sent_at)` — tenant email reports

## Consequences

### Benefits
- Cross-tenant data leak on shared tables is now **impossible at the database level** — even if every application-layer `WHERE` clause regresses.
- Missing `tenant_id` columns are filled and indexed — no more implicit-only isolation for allocations and conversation members.
- Composite indexes eliminate sequential scans for the 10 most common filtered reads.
- `@TenantId()` decorator removes boilerplate and makes tenant scoping visible in controller signatures.

### Costs
- RLS adds a per-connection `SET` statement — negligible overhead (~0.01ms per query runner connect).
- `FORCE ROW LEVEL SECURITY` means direct DB tooling (psql, pgAdmin) that connects as the app role must set `app.current_tenant_id` before querying `audit_log` or `email_log`. The `'SYS'` default handles most cases.
- New tenant-schema migrations must account for RLS when doing bulk backfills on shared tables (SET the session variable first).

### Risks
- **Pool reuse**: If `app.current_tenant_id` is not reset on every connection, a recycled connection carries the prior tenant's context. Mitigated by `TenancyAwareDataSource.connect()` always resetting both `search_path` and `app.current_tenant_id` — this also fixes a latent pool-leak bug in the original `search_path`-only approach.
- **Background jobs**: Cron tasks, AI assistant, and email sends run outside request CLS. They default to `'SYS'` (full access), which is correct — they operate across tenants by design.
- **Login flow**: Unauthenticated endpoints (`/auth/login`, `/auth/refresh`) are `@Public()` and bypass the guard chain. CLS sets `SCHEMA_NAME=public`, `tenant_id=null` → RLS context `'SYS'` → writes to `audit_log` with `tenantId=null` succeed.

## Related

- ARCH-002-TENANCY.md — Original tenancy architecture
- `MULTI_TENANCY_RUNBOOK.md` — Operational procedures
- `1777000000001-AddRlsOnSharedLedgers.ts` — RLS migration
- `1777000000001-AddTenantCompositeIndexes.ts` — Hot-path indexes

---

*SentinelFi — Precision. Resilience. Intelligence.*