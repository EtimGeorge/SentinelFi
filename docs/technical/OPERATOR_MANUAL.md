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

### 📦 Automated Database Backups
All backups are handled by the `backup-orchestrator.ts` script in the backend root.

*   **Daily Dumps:** Use `npm run backup:orchestrate` via a system cron job.
*   **Retention:** 7-day rolling window is enforced.
*   **Manual Restoration:**
    ```bash
    pg_restore -d sentinelfi_db /backups/sentinelfi-db-backup-[TIMESTAMP].sql
    ```

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
