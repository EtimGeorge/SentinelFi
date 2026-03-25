# SentinelFi: System Structure & Mapping

This guide provides a granular map of the SentinelFi monorepo, detailing how frontend pages, backend modules, and shared types coordinate to deliver a high-resilience financial platform.

## 1. Monorepo Root Overview

| Workspace | Purpose | Technology |
| :--- | :--- | :--- |
| **`/frontend`** | User Interface & Client Logic | Next.js 14, Tailwind, Zustand |
| **`/backend`** | Core Business Logic & API | NestJS, TypeORM, PostgreSQL |
| **`/shared`** | Unified Types & DTOs | TypeScript |
| **`/ai-agent`** | Intelligence & Forecasting | Python, FastAPI, LangChain |

---

## 2. Page-to-Module Relationship Map

This table maps the primary frontend routes to their corresponding backend services and data sources.

| Frontend Route | Purpose | Backend Module | Schema Context |
| :--- | :--- | :--- | :--- |
| `/login` | Authentication | `AuthModule` | `public` |
| `/admin/users` | Organization Staff Management | `AuthModule` | `public` (filtered by `tenant_id`) |
| `/super/tenants` | Platform Tenant Management | `TenantModule` | `public` |
| `/financials/projects` | Capex/Opex List | `ProjectsModule` | `[tenant_schema]` |
| `/financials/approvals` | Governance & Workflow | `CommonModule` | `[tenant_schema]` |
| `/financials/intelligence`| AI Forecasting & Narratives | `AiAssistantModule`| `[tenant_schema]` + AI Agent |
| `/billing` | Subscription & Invoicing | `BillingModule` | `public` |

---

## 3. Data Flow Architecture

### **A. Command Flow (Write)**
1.  **UI**: User submits a "New Expense" form.
2.  **API**: Frontend calls `POST /api/v1/wbs/live-expense`.
3.  **Auth**: `JwtAuthGuard` validates the token and extracts `tenant_id`.
4.  **Tenancy**: `TenancyGuard` sets the `SCHEMA_NAME` in the Async Local Storage.
5.  **DB**: `TenancyAwareDataSource` executes `SET search_path` before the `INSERT` query hits the target tenant schema.

### **B. Intelligence Flow (Read/Analyze)**
1.  **UI**: User requests a "Budget Forecast".
2.  **Backend**: `AiAssistantService` gathers raw financial data from the tenant schema.
3.  **Guardrail**: `GuardrailsService` sanitzes PII and formats the context.
4.  **AI Proxy**: NestJS forwards the payload to the Python `/ai-agent`.
5.  **LLM**: Python agent processes data via Google Gemini Pro and returns a narrative.

---

## 4. Key Security & Resilience Files

*   **[`backend/src/database/tenancy-aware-data-source.ts`](file:///c:/temp/SentinelFi/backend/src/database/tenancy-aware-data-source.ts)**: The engine of multi-tenancy.
*   **[`backend/src/auth/jwt.strategy.ts`](file:///c:/temp/SentinelFi/backend/src/auth/jwt.strategy.ts)**: The identity and caching gateway (Redis-backed).
*   **[`backend/src/common/interceptors/log-sanitization.interceptor.ts`](file:///c:/temp/SentinelFi/backend/src/common/interceptors/log-sanitization.interceptor.ts)**: The automated PII masking layer.

---
*Precision. Resilience. Intelligence. SentinelFi.*
