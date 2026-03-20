# SentinelFi: Developer Handover & Architecture Guide

Welcome to the SentinelFi ecosystem. This guide is designed to help you maintain, extend, and scale the world's most resilient financial intelligence platform.

## 1. Core Architectural Patterns

### 🗺️ Multi-Tenancy (Schema-Based)
SentinelFi uses **PostgreSQL Schema Isolation**. 
*   **Master Data:** Resides in the `public` schema (Users, Tenants, AI Logs).
*   **Tenant Data:** Resides in a dedicated schema named after the tenant (Expenses, Budgets, Projects).
*   **Implementation:** See `TenantDatabaseModule`. It dynamically injects the `TENANT_DATA_SOURCE` based on the `tenant_id` in the JWT.

### 🛡️ Enterprise Resilience Features
*   **Circuit Breakers:** Managed statefully in `AiAssistantService`. Threshold is 3 failures per 30 seconds.
*   **Global Soft-Delete:** All critical entities use `@DeleteDateColumn`. To restore a record, manually nullify the `deleted_at` field or use `.restore()` in TypeORM.
*   **Log Sanitization:** `LogSanitizationInterceptor` scrub PII globally. To add new sensitive fields, update the `sensitiveKeys` array in the interceptor.

## 2. Local Development Workflow

### Prerequisites
*   Node.js v20 (LTS)
*   Python 3.11+
*   PostgreSQL 15+
*   Redis 7+ (or Docker)

### Setup Commands
```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev

# AI Agent
cd ai-agent && python -m venv venv && pip install -r requirements.txt && uvicorn main:app --reload
```

## 3. Database Management
*   **Generating Migrations:** Always use `npm run typeorm:generate -- -n MigrationName` from the backend root.
*   **Tenant Migrations:** Automatically triggered upon tenant creation via `TenantMigrationService`.

## 4. Extending the AI Agent
*   **Prompting:** Workflows are in `ai-agent/workflows/`. Use the `financial_context` payload to inject live data into LLM prompts.
*   **Guardrails:** Always verify `GuardrailsService` in the backend if adding new AI-driven forms or analysis types.

---
*Excellence in financial engineering.*
