# Tenant Provisioning Hardening — Durable State (R1)

> **Purpose:** this file is the single source of truth for the R1 workstream so that
> no future session or agent re-derives it. Update it as part of every R1 change.
> Do **not** create a parallel handoff doc.

**Workstream:** R1 — Production provisioning integrity (tenant schema + record atomicity)
**Branch status:** uncommitted working tree (auth hardening WIP also present)
**Last updated:** verified against working tree

---

## 1. Confirmed findings (evidence-backed, do not re-litigate)

| ID | Finding | Evidence | Severity |
|----|---------|----------|----------|
| R1a | Migration resolution was **single-directory and silent** — multi-directory layouts resolved to fewer files with no error. | `path.utils.ts` original resolved one dir; `dist/backend/src/database/migrations/tenant/` (2 files) was **unreachable**. | High |
| R1a-retraction | **The "missing migrations" hypothesis was WRONG and is retracted.** The orphan directory is a *stale subset*, not a missing fix. | `1776000000002-EnsureMessagingAndNotificationsParity.ts` re-implements `MessagingGroupEntities` generically with `EXCEPTION`-guarded DDL, whereas orphaned `1773201494945-MessagingGroupEntities.ts` uses **bare, unguarded** `SET NOT NULL` + unguarded `ALTER TABLE "project" ... vat_rate`. Expanding the glob would **re-add risky DDL and duplicate FKs** → do NOT expand. | — |
| R1a-corrected | Real fix for R1a is **fail-loud resolution + migration-count verification + post-migration sentinel**, not glob expansion. | — | High |
| R1b | Schema-name derivation was **triplicated** with divergent behaviour + NAMEDATALEN truncation risk. | `tenant.service.ts:65`, `billing.service.ts:161`, `billing.service.ts:287`. | High |
| R1c | **Race → destroys a live tenant.** Preflight `DROP SCHEMA` fires on *any* existing schema, including one just created by a concurrent request for a different tenant. `@Unique(["schema_name"])` on `TenantEntity` guards **rows, not schemas** — so the unique violation fires *after* the drop, yielding: row live, subscription created, invitation emailed, **schema gone**. | `tenant.service.ts` preflight block; `tenant.entity.ts`. | Critical |
| R1d | `createTenant` was **non-atomic** across phases (schema committed in phase 1; migrations + row in phase 2). `schemaCreated` was **dead code** (set, never read). | `tenant.service.ts`. | Critical |
| R1e | No **provisioning state** existed — a tenant could be live-but-broken with no marker. | — | High |
| R1f | No **post-migration verification** — `runMigrations()` reporting success was treated as proof. | `tenant-migration.service.ts`. | High |
| R1g | Billing nested-transaction bug: `startFreeTrial` opens a `queryRunner` transaction, then calls `tenantService.createTenant()` which opens its own — nested transactions are unsupported by the TypeORM driver. | `billing.service.ts:166-179`. | High |

### Verified facts that MUST be used verbatim (getting these wrong = total provisioning outage)

- Tenant tables are **singular**: `project`, `wbs_budget`, `operational_budget`.
- `user`, `role`, `permission`, `tenant`, `audit_log` are **`schema: "public"`** — NOT tenant tables.
- Tenant migrations live in `backend/src/migrations/tenant/*.ts`.
- `backend/src/database/migrations/tenant/*.ts` holds 2 stale-subset files (see R1a-retraction).
- Public migrations run via **TypeORM CLI** (`ormconfig.ts` → `src/migrations/public/*.ts`, table `public_migrations`). They are **not** run from `database.config.ts`.
- `dist` layout is `backend/dist/backend/src/...` (TS common-root is the repo root because `include` spans `../shared/types/**`). `path.resolve(__dirname, "..", "..")` therefore lands correctly on `dist/backend/src`.

---

## 2. Landed (Stage A — self-contained artifacts)

- `backend/src/common/utils/schema-name.util.ts` — canonical derivation (single implementation).
- `backend/src/common/utils/path.utils.ts` — fail-loud resolution + `countTenantMigrationFiles()`.
- `shared/types/tenant-provisioning-status.enum.ts` — provisioning state enum.
- `backend/src/tenants/tenant.entity.ts` — provisioning columns added.
- `backend/src/migrations/public/1777000000002-AddTenantProvisioningStatus.ts` — backfill migration (public schema).

## 3. Unwired (Stage B — the actual work remaining)

- [ ] **B1** `tenant.service.ts` — replace inline derivation with `schema-name.util`; **remove destructive `DROP SCHEMA` preflight for tenant-creation** (replace with explicit conflict error); make provisioning state-tracked; delete `schemaCreated` dead code.
- [ ] **B2** `database/tenant-migration.service.ts` — call `countTenantMigrationFiles()` (verified: 21 in this build) and **fail loud on mismatch**; add post-migration **sentinel check** for `project`, `wbs_budget`, `operational_budget`.
- [ ] **B3** `auth/guards/jwt-auth.guard.ts` — refuse access when tenant provisioning state is not ready.
- [ ] **B4** `billing/billing.service.ts` — remove nested transaction (R1g); route both schema derivations through `schema-name.util`.
- [ ] **B5** Tests: schema-name unit tests, provisioning-state transition tests, sentinel-failure test.

## 4. Verification gate (AGENTS.md) — not yet run

```
npx tsc --noEmit                                  # frontend
npx tsc --noEmit -p backend/tsconfig.json         # backend
npm test --workspace frontend                     # jest
npx next lint                                     # eslint
```