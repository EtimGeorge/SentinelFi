# Multi-Tenancy Operational Runbook

## Overview

SentinelFi enforces tenant isolation at three layers:

1. **Schema boundary** (primary) — Each tenant has its own PostgreSQL schema. `search_path` routing ensures queries resolve to the correct schema.
2. **Row-Level Security** (defense-in-depth) — Shared public tables (`audit_log`, `email_log`) have RLS policies keyed on `app.current_tenant_id`.
3. **Application WHERE clauses** — Services inject `tenant_id` into every query.

## Quick Reference

| Concern | Where | What to check |
|---------|-------|---------------|
| Tenant not resolving | `tenancy.guard.ts` | CLS `SCHEMA_NAME` set? Tenant exists in `tenants` table? |
| Cross-tenant data visible | `tenant-access.guard.ts` | `req.params.tenantId === req.user.tenant_id`? |
| RLS blocking legitimate reads | `pg_catalog.pg_policies` | `app.current_tenant_id` set correctly for the connection? |
| RLS not blocking cross-tenant | `audit_log` / `email_log` | `FORCE ROW LEVEL SECURITY` applied? Policy exists? |
| Slow queries | `pg_stat_user_indexes` | Composite indexes present? |

## Common Operations

### Adding a new table to a tenant schema

1. Create entity in the appropriate feature module (omit `schema` — TypeORM routes via `search_path`).
2. Add entity to `DatabaseConfig.getTenantEntities()` if not auto-discovered.
3. Create a tenant migration (`backend/src/migrations/tenant/`) with unqualified table names.
4. Run bulk migration: `npx ts-node backend/scripts/run-all-tenant-migrations.ts`
5. **Do NOT add RLS** to tenant-schema tables — schema boundary already isolates them.

### Adding a new shared public table that carries tenant data

1. Add `tenant_id: string | null` column (or `tenantId` for camelCase entities like `audit_log`).
2. Add `@Index()` on the tenant column.
3. Create a public migration that enables RLS:
   ```sql
   ALTER TABLE "public"."my_table" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "public"."my_table" FORCE ROW LEVEL SECURITY;
   CREATE POLICY "tenant_isolation" ON "public"."my_table"
     FOR ALL
     USING (
       COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS') = 'SYS'
       OR "tenant_id"::text = NULLIF(COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS'), 'SYS')
     )
     WITH CHECK (
       COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS') = 'SYS'
       OR "tenant_id"::text = NULLIF(COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'SYS'), 'SYS')
     );
   ```
4. Verify with: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'my_table';`

### Adding a composite index to tenant schemas

1. Create migration in `backend/src/migrations/tenant/` with `CREATE INDEX IF NOT EXISTS`.
2. Use unqualified table names (search_path handles schema routing).
3. Run bulk migration: `npx ts-node backend/scripts/run-all-tenant-migrations.ts`
4. Verify: `SELECT indexname FROM pg_indexes WHERE tablename = 'your_table';`

### Running bulk tenant migrations

```bash
# From backend/ directory
npx ts-node scripts/run-all-tenant-migrations.ts
```

This iterates all rows in `public.tenants`, creates a per-schema DataSource, and runs pending migrations.

### Checking RLS status

```sql
-- List policies on shared tables
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('audit_log', 'email_log');

-- Check if RLS + FORCE are enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('audit_log', 'email_log');
```

### Checking the RLS session variable

```sql
-- Simulate a tenant connection (run inside the app's connection context)
SHOW app.current_tenant_id;

-- Or check current value
SELECT current_setting('app.current_tenant_id', true);
-- Returns: tenant UUID, 'SYS', or '' (unset)
```

## Troubleshooting

### "query would be affected by row-level security policy"

**Cause**: RLS policy is blocking a query. Usually means `app.current_tenant_id` is unset or doesn't match the row's tenant.

**Fix**:
1. Verify the query runs within a request context (CLS has `tenant_id`).
2. For background jobs, ensure `TenancyAwareDataSource.connect()` runs before the query.
3. For direct DB access, set the session variable:
   ```sql
   SET app.current_tenant_id = 'SYS';
   ```
4. For migration scripts, set it before DML:
   ```sql
   SET app.current_tenant_id = 'SYS';
   ```

### Tenant data appearing in another tenant's view

**Cause**: Missing `tenant_id` WHERE clause in a service, or RLS policy missing/disabled.

**Fix**:
1. Check `pg_policies` — RLS policy exists and is enforced?
2. Check `pg_class.relrowsecurity` and `relforcerowsecurity` — both true?
3. Check the service — does the query include `tenant_id` in the WHERE clause?
4. Check for raw SQL queries that bypass TypeORM's entity metadata.

### Pool leak — stale search_path or tenant_id

**Cause**: A pooled connection was reused without resetting context.

**Fix**: `TenancyAwareDataSource.connect()` always resets both `search_path` and `app.current_tenant_id` on every `queryRunner.connect()`. If you see stale values:
1. Verify `TenancyAwareDataSource` is used for all connection pools (not raw `DataSource`).
2. Check for `dataSource.query()` calls that bypass `createQueryRunner()`.
3. Restart the backend to flush the connection pool.

### SuperAdmin impersonation breaks after RLS

**Cause**: Impersonation sets a tenant context but the SuperAdmin's `app.current_tenant_id` is `'SYS'`.

**Fix**: Impersonation uses the target tenant's `app.current_tenant_id`. The `superadmin.service.ts` calls `cls.set("SCHEMA_NAME", ...)` and `cls.set("tenant_id", ...)` before queries. Verify CLS is set in the impersonation flow.

## Monitoring

### Key metrics to watch

| Metric | Source | Threshold |
|--------|--------|-----------|
| `pg_stat_user_indexes.idx_scan` | PostgreSQL | Composite indexes should show >0 scan count |
| `pg_stat_user_tables.seq_scan` | PostgreSQL | Tenant tables with >1000 rows should use indexes |
| Connection pool size | TypeORM metrics | Should stay below configured max (5-10 for Neon) |
| RLS policy violations | Application logs | Any occurrence warrants investigation |

### Useful queries

```sql
-- Most-used indexes (identify unused composites)
SELECT schemaname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'tenant_1')
ORDER BY idx_scan DESC;

-- Sequential scans on large tables (missing indexes?)
SELECT schemaname, relname, seq_scan, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY seq_scan DESC LIMIT 20;

-- Active connections and their search_path
SELECT pid, usename, query, application_name
FROM pg_stat_activity
WHERE state = 'active';
```

## Emergency Procedures

### Disable RLS (emergency)

If RLS causes a production outage:

```sql
-- Remove FORCE first (allows owner bypass)
ALTER TABLE "public"."audit_log" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_log" NO FORCE ROW LEVEL SECURITY;

-- Or disable entirely
ALTER TABLE "public"."audit_log" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_log" DISABLE ROW LEVEL SECURITY;
```

Then restart the backend to apply. **Re-enable as soon as possible** — RLS is defense-in-depth, not the primary isolation layer.

### Flush connection pool

If stale tenant context is detected:

```bash
# Restart backend (Neon serverless resets connections automatically)
# For self-hosted: restart the backend process
```

## Related

- ARCH-002-TENANCY.md — Schema-per-tenant architecture
- ARCH-009-MULTI-TENANCY-ISOLATION.md — Isolation model ADR
- `backend/src/database/tenancy-aware-data-source.ts` — DataSource with search_path + RLS context
- `backend/src/migrations/public/1777000000001-AddRlsOnSharedLedgers.ts` — RLS migration

---

*SentinelFi — Precision. Resilience. Intelligence.*