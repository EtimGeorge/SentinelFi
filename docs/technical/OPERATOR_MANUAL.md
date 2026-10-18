# SentinelFi: Operator Manual & Scaling Guide

This guide is built for the platform operators and SREs who manage the high-availability production environment of SentinelFi.

## 1. Scaling for 10,000+ Concurrent Users

### ⚡ Infrastructure Strategy
To support 10,000 users, we recommend the following horizontal scaling strategy:

*   **Load Balancing:** Deploy an NGINX or AWS ALB with SSL termination.
*   **Backend Sharding:** Run multiple instances of the NestJS backend behind a round-robin Load Balancer.
*   **AI Agent Scaling:** Run multiple Python instances. Ensure `AI_AGENT_URL` in the backend points to the AI Load Balancer.
*   **Redis Cluster:** Use a multi-node Redis cluster (e.g., ElastiCache) for caching dashboard summaries and circuit breaker state.

## 2. Disaster Recovery & Backups

### 🎯 Recovery Objectives
| Metric | Target | Mechanism |
| :--- | :--- | :--- |
| **RPO** (max tolerable data loss) | ≤ 24 h | Nightly off-site dump (02:17 UTC) |
| **RPO** (tight) | ≤ 5 min | Neon point-in-time restore (PITR) |
| **RTO** (restore from dump) | ≤ 60 min | R2 dump + `pg_restore` |
| **RTO** (PITR branch swap) | ≤ 15 min | Neon restore-to-branch, repoint `DATABASE_URL` |

### 🧱 Backup Layers
1.  **Neon PITR (primary, fast):** enabled on the Neon project; recover to any point in the retention window without our tooling.
2.  **Off-site logical dumps (portable):** `.github/workflows/db-backup.yml` runs nightly at 02:17 UTC via `npm run backup:orchestrate --workspace backend` (`backend/scripts/backup-orchestrator.ts`). It writes a **plain `.sql`** *and* a **custom-format `.dump`** to the local `backups/` directory, then uploads both to Cloudflare R2 under `db-backups/`.
    *   Local retention: 7 days (`BACKUP_LOCAL_RETENTION_DAYS`).
    *   R2 retention: 30 days (`BACKUP_REMOTE_RETENTION_DAYS`).
    *   In `NODE_ENV=production` the script **fails loudly** if R2 is not configured — a backup nobody can off-site is not a backup.
3.  **R2 bucket versioning (recommended):** enable versioning on the bucket that holds user uploads so deleted/overwritten objects are recoverable.

Required GitHub repository secrets for the nightly job: `PROD_DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (and optional `R2_ENDPOINT`). A red run means production has no fresh off-site backup — treat it as SEV-2.

### ♻️ Restoring Data
`pg_restore`/`psql` must be **at least the same major version** as the server, and `DATABASE_URL` must be the Neon **direct (unpooled)** hostname, never the `-pooler` host.

**Preferred — restore the custom-format dump:**
```bash
pg_restore --no-owner --no-acl --clean --if-exists -d "$DATABASE_URL" sentinelfi-db-backup-[TIMESTAMP].dump
```

**Fallback — replay the plain SQL dump:**
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sentinelfi-db-backup-[TIMESTAMP].sql
```

**Tenant data lives in per-tenant schemas.** A full dump contains every schema. To restore a single tenant without touching the rest:
```bash
pg_restore --schema=[tenant_schema] --no-owner --no-acl -d "$DATABASE_URL" sentinelfi-db-backup-[TIMESTAMP].dump
```
After any partial restore, reconcile that schema by running the tenant migrations: `npm run db:run-tenant-migrations`.

### 🧪 Restore Drill (quarterly)
1.  Create a scratch Neon branch from production.
2.  Restore the most recent R2 dump into the branch (commands above).
3.  Run tenant migrations and smoke-test a login + one financial report.
4.  Record the actual RTO and file it against the target table above, then delete the branch.

### 🛡️ Data Resilience (Soft-Delete)
If a critical record is accidentally deleted by a super-admin, you can "restore" it by finding the record with a non-null `deleted_at` field and clear the timestamp.

## 3. Monitoring & Observability

### 🚨 Operational Dashboard (Health)
Monitor `https://api.sentinelfi.com/api/v1/health` for real-time status:

*   **`ai_circuit_breaker`**: If status is `isOpen: true`, the AI agent is struggling. Monitor backend logs for the root cause.
*   **`memory_heap` / `memory_rss`**: Ensure memory doesn't cross the thresholds (150MB heap / 300MB RSS).
*   **`redis` / `database`**: Crucial indicators for connectivity across the monorepo.

### 📋 Log Sanitization
All production logs are scrubbed for PII and secrets by default. Ensure that external logging infrastructure (e.g., Datadog, ELK) respects these masked fields.

---
*Stability and uptime for the world's most critical financial structures.*
