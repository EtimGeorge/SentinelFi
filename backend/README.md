# SentinelFi: Backend Enterprise Core

The SentinelFi Backend is a high-performance NestJS (TypeScript) system engineered for multi-tenant financial oversight and resilient AI orchestration.

## 🏗️ Architecture: Modular & Resilient

The backend follows a modular, service-oriented architecture designed for 10,000+ concurrent mission-critical users:

*   **[`/src/auth`](./src/auth)**: Enterprise authentication (JWT) with RBAC (Role-Based Access Control).
*   **[`/src/tenants`](./src/tenants)**: Schema-based multi-tenancy orchestration. Provides 100% data isolation.
*   **[`/src/ai-assistant`](./src/ai-assistant)**: Autonomous AI proxy. Manages financial context injection, prompt guardrails, and circuit breakers.
*   **[`/src/wbs`](./src/wbs)**: Structural Project/Budget governance (structural hierarchy).
*   **[`/src/operational-budgets`](./src/operational-budgets)**: Chronological OPEX tracking and real-time monitoring.

## ⚡ Enterprise Hardening (Resilience Suite)

To ensure sub-second performance and "Bulletproof" stability, the backend implements:

1.  **Multi-Tenant Redis Caching:** Dashboard summaries are cached per-tenant, bypassing the database for repetitive high-traffic queries.
2.  **AI Circuit Breaker:** Injected into `AiAssistantService`. If the AI Agent fails 3 times, the system trips the circuit and serves cached results to maintain 100% uptime.
3.  **Global Rate Limiting:** Tiered per-IP protection to mitigate DDoS and "noisy neighbor" scenarios.
4.  **Log Sanitization:** An automated interceptor scrubs PII and administrative secrets (passways, tokens) from production audit logs.
5.  **Data Governance:** Global **Soft-Delete** (`deleted_at`) prevents irreversible data loss via accidental record deletion.

## 🚦 Monitoring & Health

Access the real-time health dashboard:
*   **URL:** `https://api.sentinelfi.com/api/v1/health`
*   **Indicators:** PostgreSQL Link, Redis Connection, AI Agent Availability, Memory Usage (Heap/RSS), and **AI Circuit Breaker Status**.

## 🛠️ Development & Data

*   **TypeORM Migrations:**
    ```bash
    npm run typeorm:generate --name MyMigration
    npm run typeorm:run
    ```
*   **Disaster Recovery:**
    SentinelFi includes an automated backup orchestrator:
    ```bash
    npm run backup:orchestrate  # Automated pg_dump with 7-day retention
    ```

---
*Ensuring the integrity of the world's most critical financial structures.*
