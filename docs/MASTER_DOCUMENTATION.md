# SentinelFi: Master System Documentation

This is the comprehensive technical guide for the SentinelFi Financial Intelligence platform. It aggregates the project architecture, operational manuals, and scaling strategies into a single source of truth.

---

## 🚀 1. Quick Start: Launching the Application

### 🐳 Option A: Docker (Containerized)
The entire monorepo is dockerized for seamless orchestration.
1. **Prerequisites:** Install Docker Desktop.
2. **Setup:** Ensure the unified **`.env.prod`** file in the root directory is populated with your production keys (Database, Redis, Gemini API, etc.).
3. **Execute:**
   ```bash
   docker-compose up --build
   ```
4. **Access:**
   - **Frontend:** [http://localhost:3001](http://localhost:3001)
   - **Backend API:** [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
   - **AI Agent API:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 💻 Option B: Native (Direct Execution)
Best for core development and debugging.

**Step 1: Backend (NestJS)**
```bash
cd backend
npm install
npm run start:dev
```

### from root directory:
```bash
npm run start:backend:dev
```

**Step 2: Frontend (Next.js)**
```bash
cd frontend
npm install
npm run dev
```

### from root directory:
```bash
npm run dev:frontend
```

**Step 3: AI Agent (Python/FastAPI)**
```bash
cd ai-agent
python -m venv venv
./venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🏗️ 2. Monorepo Architecture Overview

SentinelFi is built as a high-resilience, multi-tenant financial platform.

- **Frontend (`/frontend`)**: Next.js 14 (App Router) with Tailwind CSS. Features a "Glassmorphism" UI and state-managed context for real-time finance tracking.
- **Backend (`/backend`)**: NestJS (TypeScript) with TypeORM. Implements schema-based multi-tenancy and enterprise resilience patterns.
- **AI Agent (`/ai-agent`)**: FastAPI (Python) with LangChain and Google Gemini Pro. The intelligence layer for forecasting and reporting.

### 🗺️ Multi-Tenancy (Schema-Based)
SentinelFi uses **PostgreSQL Schema Isolation**:
- **Master Data:** Resides in the `public` schema (Users, Tenants, AI Logs).
- **Tenant Data:** Resides in a dedicated schema named after the tenant (Expenses, Budgets, Projects).
- **Implementation:** The `TenantDatabaseModule` dynamically injects the `TENANT_DATA_SOURCE` based on the `tenant_id` resolved from the JWT.

---

## 🛡️ 3. Enterprise resilience & Hardening

### ⚡ Circuit Breakers
- **Frontend:** Located in `lib/resilience.ts`. Protects against UI-blocking API failures.
- **Backend:** Located in `AiAssistantService`. Threshold: 3 failures/30s. Automatically serve cached data when tripped.

### 📋 Security & Audit
- **Log Sanitization:** `LogSanitizationInterceptor` scrubs PII (Personal Identifiable Information) and tokens globally.
- **Soft-Delete:** All critical entities (User, Budget, Expense) use `@DeleteDateColumn` to prevent accidental data loss.
- **Audit Logging:** Every administrative action and AI query is logged to the `audit_logs` and `ai_audit_logs` tables.

---

## 📈 4. Scaling for 10,000+ Users

### ⚡ Infrastructure Strategy
- **Load Balancing:** Use NGINX or AWS ALB for SSL termination and traffic distribution.
- **Backend Sharding:** Run multiple NestJS instances behind a Load Balancer.
- **Redis Cluster:** Required for caching dashboard summaries and synchronized circuit breaker states across nodes.
- **AI Scaling:** The AI Agent is stateless; scale it horizontally via an AI Load Balancer.

---

## 📦 5. Disaster Recovery & Maintenance

### 🗄️ Database Backups
All backups are handled by the `backup-orchestrator.ts` script in the backend root.
- **Daily Dumps:** Use `npm run backup:orchestrate` via cron.
- **Retention:** 7-day rolling window enforced.
- **Restore:** `pg_restore -d sentinelfi_db /backups/sentinelfi-db-backup-[TIMESTAMP].sql`

### 🛠️ Maintenance Tasks
- **Generating Migrations:** `npm run typeorm:generate -- -n MigrationName`
- **Clearing Cache:** Use the `/api/v1/health` endpoint's monitoring logic to verify Redis connectivity.
- **Email Configuration**: Complete guide for SMTP/Resend setup: [EMAIL_SETUP_GUIDE.md](file:///c:/temp/SentinelFi/docs/EMAIL_SETUP_GUIDE.md)
- **Generating Migrations**: `npm run typeorm:generate -- -n MigrationName`
- **Clearing Cache**: Use the `/api/v1/health` endpoint's monitoring logic to verify Redis connectivity.

---
*Precision. Resilience. Intelligence. SentinelFi.*
