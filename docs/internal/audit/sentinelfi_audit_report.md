# SentinelFi â€” Deep Audit Report & Implementation Plan

> **Scope**: Backend (NestJS), Frontend (Next.js), AI Agent (Python), Containerisation, Scalability, Documentation
> **Conducted**: March 2026 | **Status**: Findings Complete â€” 53 Issues Found

---

## Executive Summary

SentinelFi is a sophisticated multi-tenant financial intelligence platform with strong architectural foundations: multi-guard authentication (JWT â†’ Tenancy â†’ TenantAccess), transaction-safe WBS expense processing, real Paystack/PayPal webhook handlers, and a Redis-backed WebSocket layer. However, **53 issues** were identified ranging from critical security vulnerabilities to significant UX regressions that would block a production deployment.

---

## ðŸ”´ CRITICAL (Security / Data Integrity) â€” Must fix before deployment

| # | Location | Issue | Impact |
|---|----------|-------|--------|
| C1 | `auth.service.ts:410` | **Password cache key includes plain-text password** (`password_hash:${email}:${plainTextPassword}`). An in-memory attacker or heap dump exposes user passwords. | Credential exposure |
| C2 | `auth.service.ts:548â€“557` | **JWT logout is stateless with no token blacklist**. Logging out only clears the in-memory password cache. The issued JWT remains valid for the rest of its lifetime (1â€“24h) after logout. | Session hijacking |
| C3 | `auth.controller.ts:270â€“274` | **`resetPassword` is a stub placeholder** â€” it returns a success message without actually hashing or storing a new password, or sending an email. Calling it does nothing. | Broken feature |
| C4 | `auth.controller.ts:186` | **`acceptInvitation` DTO typed as `any`** â€” bypasses all validation pipe checks. A malicious actor can inject arbitrary fields. | Security bypass |
| C5 | `superadmin.service.ts:596` | **`resetTenantAdminPassword` accepts `any` DTO**. No minimum password length validation. No CSRF check. | Weak access control |
| C6 | `docker-compose.yml:24` | **Backend port 3000 exposed directly** â€” the NestJS API is exposed on the host without a reverse proxy. No rate limiting at the infrastructure layer. | DDoS surface |
| C7 | `main.ts:26â€“32` | **CORS allows a single string origin** â€” does not support multiple origins (e.g., staging + production), making it fragile for multi-environment deployments. | CORS misconfiguration |
| C8 | `billing.service.ts:255` | **Paystack secret pulled with `!` (non-null assertion)**. If `PAYSTACK_SECRET_KEY` is undefined, HMAC validation silently uses an empty string, accepting any payload. | Webhook forgery |

---

## ðŸŸ  HIGH (Broken or Placeholder Features) â€” Blocks real usage

| # | Location | Issue |
|---|----------|-------|
| H1 | `superadmin.service.ts:254â€“255` | `wbsBudgetsCount` and `liveExpensesCount` in `getTenantDetails()` are hardcoded `0` (explicit comment: "Placeholder"). Tenant detail screen always shows 0. |
| H2 | `superadmin.service.ts:481â€“484` | `getBillingOverview()` â€” `mrrGrowthPercentage` is hardcoded `12.5`, `subscriptionGrowthPercentage` is `8.2`. These are fictional numbers shown to the SuperAdmin. |
| H3 | `superadmin.service.ts:488â€“499` | `getRecentInvoices()` generates virtual invoices from tenant rows, not from a real Invoices table. Every tenant masquerades as a paid invoice. |
| H4 | `reporting.service.ts:88â€“108` | `generateAndArchiveReport()` creates a DB record with a file path but **never writes the file to disk** (comment: "Actual filesystem write logic should be here"). Archived reports are ghosts. |
| H5 | `reporting.service.ts:229â€“248` | `explainVariance()` is a hand-crafted string template, not an AI call. It hardcodes a `$50,000` threshold and always labels it "STABLE" or "CRITICAL", creating false confidence. |
| H6 | `super/index.tsx:436` | **Active sessions counter** is calculated as `activeTenantsCount * 3 + 2` â€” a fantasy number. |
| H7 | `super/index.tsx:410` | **Churn Risk Index** is hardcoded to `LOW` regardless of actual data. |
| H8 | `super/index.tsx:432` | **Security Posture** is hardcoded to `REINFORCED` â€” not wired to any audit/threat data. |
| H9 | `dashboard/ceo.tsx:116` | `totalCommittedLPO` KPI is hardcoded to `0` â€” this is a major financial metric that should come from the LPO table. |
| H10 | `auth.controller.ts:301` | **`stopImpersonation` endpoint clears the user's cookie** but never re-issues the original SuperAdmin's token. SuperAdmin is logged out and must manually re-log in. |
| H11 | `wbs.service.ts (batch)` | `logLiveExpenseBatch` creates a new `queryRunner` per item in a sequential loop instead of a single transaction. 1,000 items = 1,000 DB roundtrips. Catastrophically slow at scale. |

---

## ðŸŸ¡ MEDIUM (Incomplete Logic / Single Responsibility Violations) â€” Must address before stable release

| # | Location | Issue |
|---|----------|-------|
| M1 | `auth.service.ts:75â€“102` | `AuthService` handles JWT signing, password hashing, user CRUD, audit logging, impersonation, and invitation acceptance. **One class doing 7+ tasks** â€” must be split. |
| M2 | `superadmin.service.ts:206â€“224` | `impersonateTenant` delegates to `impersonateUser` but also appears in `AuthService.impersonate`. **Two parallel impersonation code paths** with different token lifetimes (4h vs 30min). |
| M3 | `billing.service.ts:86â€“144` | `startFreeTrial` calls `tenantService.createTenant()` inside a `queryRunner` transaction it opened, but `createTenant` opens its own nested transaction â€” **nested transactions not supported** by the standard TypeORM driver. |
| M4 | `wbs.service.ts:92â€“93` | `CRITICAL_OVERRIDE_ROLES` uses string literals â€” if the `Role` enum changes, governance checking silently breaks. Must reference the `Role` enum. |
| M5 | `wbs.service.ts:276â€“291` | `findAllChildren` uses recursive N+1 queries (one query per depth level). A 5-level deep WBS tree = 5+ sequential DB calls. Use a recursive CTE instead. |
| M6 | `dashboard.service.ts:99` | `getRecentActivity` uses the string `'AuditLogEntity'` as repository token â€” this will silently return empty if entity name ever changes. |
| M7 | `superadmin.service.ts:338â€“361` | `getSystemHealth()` uses `os.loadavg()` which returns `[0, 0, 0]` on Windows (not supported). CPU reads will always show `0%` in the dev environment. |
| M8 | `backend/Dockerfile` | Production image copies the entire `node_modules/` from the build stage â€” includes devDependencies. Image is unnecessarily large (~2x overhead). |
| M9 | `docker-compose.yml` | Missing: healthcheck for backend, Redis service (app references Redis for WebSockets but compose doesn't define it), frontend missing port-forward env var for API URL, no volume for report uploads. |
| M10 | `frontend/.env.local` | `NEXT_PUBLIC_API_URL` must be set at build time for Next.js â€” missing from the Docker frontend build args. Frontend will call `undefined` API URL in production. |

---

## ðŸ”µ SCALABILITY & CONCURRENCY â€” 10,000 Concurrent Users Assessment

### Current State
| Component | Observation | Bottleneck Risk |
|-----------|-------------|-----------------|
| DB Pool | Capped at 5 connections (by design for Neon free tier) | **CRITICAL at 10K users** |
| Authentication | bcrypt rounds (~10) blocking the event loop per login | High CPU per login |
| Login Cache | In-memory `Map` â€” **does not survive a pod restart, not shared across replicas** | Cache miss storm |
| Password Cache | In-memory `Map` â€” same problem | |
| WebSockets | Redis adapter configured but Redis is not in `docker-compose.yml` | Horizontal scaling blocked |
| WbsBudget Rollup | Recursive CTE query â€” efficient; one query | âœ… OK |
| Batch Expense | N sequential queryRunners | Will time out >100 items |
| Reporting | PDF/Excel generation is synchronous, blocking | Will queue at 10K users |

### Verdict: **Will not sustain 10,000 concurrent users** in current form without:
1. A real connection pool (PgBouncer) or Neon's serverless driver
2. A shared Redis cache for login deduplication and password cache
3. A job queue (BullMQ) for report generation
4. Horizontal scaling (the app is stateful on login cache)
5. Rate limiting at the infra level (nginx/Cloudflare) not just Throttler

---

## ðŸ“± FRONTEND â€” Mobile Friendliness & UI Issues

| # | Location | Issue |
|---|----------|-------|
| F1 | `pages/super/index.tsx:284` | Amount values (`text-4xl font-bold`) â€” on narrow cards at 375px, 7-figure NGN amounts (e.g., `â‚¦1,250,000.00`) wrap to two lines inside the 4-column KPI grid. |
| F2 | `pages/dashboard/ceo.tsx:276` | CEO KPI cards use `text-3xl font-semibold` â€” same wrapping issue at mobile breakpoints. |
| F3 | `pages/super/index.tsx:276` | SuperAdmin KPI grid is `lg:grid-cols-4` â€” on `md` screens (768px) these are 2 columns, which is fine, but the text size is not scaled down. |
| F4 | CEO dashboard | Missing OPEX rollup data â€” the `viewContext` toggle switches the UI label but **both views call the same `/wbs/budget/rollup` endpoint**. OPEX context fetches WBS data, not operational budgets. |
| F5 | `pages/super/tenants.tsx` (37KB) | This is the largest page â€” over 900 lines. Likely has unguarded fetch calls without AbortController. |
| F6 | All chart pages | Charts use `recharts` but there is no `ResponsiveContainer` min-height guard â€” on mobile they collapse to 0px height and become invisible. |

---

## ðŸ-ï¸ CEO DASHBOARD â€” Currently Incomplete

The current CEO Dashboard (`/dashboard/ceo.tsx`) is a basic WBS rollup viewer. It is missing the full executive intelligence it should provide:

**Missing Features:**
- Operational budget (OPEX) view â€” the toggle is UI-only, data is identical
- Cash flow projection / burn rate exhaustion chart (backend computes `estimatedExhaustionDate` but frontend doesn't show it)
- Project portfolio health (status: On Budget / Over Budget / At Risk)
- `totalCommittedLPO` KPI (hardcoded 0)
- Team performance / resource utilization
- AI narrative summary for the executive (the `explainVariance` endpoint exists but is never called from the CEO dashboard)
- Annotation system (backend exists at `/dashboard/annotations` â€” not wired to CEO dashboard)
- PDF export button

---

## ðŸ›¡ï¸ ADMIN & SUPERADMIN FLOW CONNECTIVITY

| Gap | Description |
|-----|-------------|
| Invitation flow | SuperAdmin can provision tenant â†’ magic link sent â†’ admin user sets password via `/auth/invitation/accept`. **Flow works** but `acceptInvitation` body is typed as `any` (C4). |
| Impersonation | Two parallel impersonation implementations (AuthController vs SuperAdminService) with different token TTLs. Need unification. |
| Plan upgrades | `updateTenantPlan` updates the DB but **does not update the subscription record** and does not trigger any email/notification. |
| Tenant archival | `softDeleteTenant` deactivates but does not revoke active JWT tokens for users of that tenant. Users remain logged in post-archive. |
| SuperAdmin analytics | WBS/OPEX cross-tenant queries are raw SQL string interpolation against `tenant.schema_name`. Safe if `schema_name` is validated on creation (it is), but fragile â€” no test coverage. |

---

## ðŸ³ CONTAINERISATION READINESS

### Backend Dockerfile Issues
```diff
- COPY --from=development /app/node_modules ./node_modules  # copies ALL devDeps (~400MB extra)
+ RUN npm ci --omit=dev                                      # install only production deps
```

### Missing in docker-compose.yml
- Redis service (required for WebSocket scaling)
- Healthcheck for backend (required for orchestrators like Kubernetes)
- Environment variable injection for the frontend API URL at build time
- Named volume for report file uploads
- No nginx reverse proxy service

### Best Deployment Platform
Given the architecture (NestJS + Next.js, PostgreSQL on Neon, Redis for WS, file uploads):
> **Recommended: Railway.app (immediate), Kubernetes on GKE/EKS (long-term)**
>
> - **Railway**: Native Docker support, managed Redis, managed PostgreSQL, zero-config HTTPS, ~$20/month. Perfect for current stage.
> - **Render**: Good alternative, similar to Railway, used successfully in related projects.
> - **AWS ECS + RDS** or **GKE**: Best for 10K+ users. Requires more DevOps investment.
> - **Vercel (Frontend) + Railway (Backend)**: Excellent hybrid â€” Vercel for Next.js SSR edge performance, Railway for the API.

---

## ðŸ“š DOCUMENTATION & README PLAN

The following documentation must be created for the application:

1. **`README.md` (Root)** â€” Project overview, tech stack, local dev setup, environment variables, quick start
2. **`docs/ARCHITECTURE.md`** â€” System architecture diagram (multi-tenant schema model, auth flow, payment flow)
3. **`docs/API.md`** â€” Complete REST API reference (can be auto-generated from NestJS Swagger decorators once added)
4. **`docs/DEPLOYMENT.md`** â€” Docker, docker-compose, Railway/Render deployment guide, environment variable reference
5. **`docs/SECURITY.md`** â€” JWT lifecycle, CORS policy, rate limiting, role hierarchy, audit log schema
6. **`docs/CONTRIBUTING.md`** â€” Git conventions, branch strategy, code standards
7. **`docs/backend/`** (already exists) â€” Keep and expand module-level docs

---

## âœ… SEQUENCED IMPLEMENTATION PLAN

All work below is sequenced to minimize regression risk. Each phase builds on the previous.

---

### PHASE 1 â€” Critical Security Fixes (â± ~1 day)

**1.1 Fix password cache key (C1)**
- `auth.service.ts`: Change cache key from `password_hash:${email}:${plainTextPassword}` to `password_hash:${email}` and store only `{ hash, timestamp }`. Compare the hash, not the password.

**1.2 Implement JWT token blacklist (C2)**
- Add a Redis-backed `TokenBlacklistService`. On logout, write `token_jti â†’ expiry` to Redis.
- Update `JwtStrategy.validate()` to check the blacklist before returning the user.

**1.3 Implement real password reset flow (C3)**
- `auth.service.ts`: Add `requestPasswordReset(email)` â€” generates a time-limited reset token, stores its hash in the DB, emails a link.
- Add `resetPassword(token, newPassword)` â€” validates token, hashes new password, marks token as consumed.
- Wire to `auth.controller.ts`.

**1.4 Type and validate `acceptInvitation` DTO (C4)**
- Create `AcceptInvitationDto` with `@IsString`, `@MinLength(8)`, etc.
- Apply `@Body(ValidationPipe)` to the controller method.

**1.5 Validate `resetTenantAdminPassword` DTO (C5)**
- Create `ResetTenantAdminPasswordDto` with `@MinLength(8)` and `@IsString({ each: true })`.
- Apply to the controller.

**1.6 Fix Paystack secret null safety (C8)**
- `billing.service.ts`: Change `secret!` to a guarded check: `if (!secret) throw new InternalServerErrorException(...)`.

---

### PHASE 2 â€” Fix Broken / Placeholder Features (â± ~2 days)

**2.1 Fix tenant detail resource counts (H1)**
- `superadmin.service.ts:getTenantDetails()`: Execute real cross-schema SQL for `wbsBudgetsCount` and `liveExpensesCount` using `this.dataSource.query()`.

**2.2 Fix MRR growth calculation (H2)**
- Add a `SubscriptionHistoryEntity` or use `created_at` timestamps to compute real MoM growth.
- Replace hardcoded `12.5%` and `8.2%` with computed values.

**2.3 Create real Invoices table and service (H3)**
- Add `InvoiceEntity` (id, subscription_id, tenant_id, amount, status, issued_at, pdf_path).
- Auto-generate an invoice record when a subscription is activated (in `activateSubscription()`).
- Wire `getRecentInvoices()` to query this table.

**2.4 Implement report file persistence (H4)**
- `reporting.service.ts`: Add file write logic using Node.js `fs.promises.writeFile()` to `uploads/reports/{tenantId}/{fileName}`.
- For production: integrate with Wasabi/S3 via a `StorageService`.

**2.5 Wire real AI variance explanation (H5)**
- Replace the string template in `explainVariance()` with a call to the Python AI agent (via the existing `AiAssistantModule`).
- Forward the top 5 variance items and return the agent's natural language summary.

**2.6 Fix CEO Dashboard LPO KPI (H9)**
- `dashboard/ceo.tsx`: Fetch committed LPO data from `/wbs/lpos?status=committed&projectId=X`.
- Show real `totalCommittedLPO` value.

**2.7 Fix CEO OPEX context view (F4)**
- `dashboard/ceo.tsx`: When `viewContext === 'operational'`, call `/operational-budgets/rollup` instead of `/wbs/budget/rollup`.
- Update `kpis` state from the OPEX rollup response.

**2.8 Fix SuperAdmin impersonation stop (H10)**
- Store the original SuperAdmin's JWT in a `httpOnly` second cookie (`sa_token`) before switching.
- On `stopImpersonation`, re-issue the `sa_token` as the primary `access_token` and clear `sa_token`.

---

### PHASE 3 â€” Architecture & Performance (â± ~3 days)

**3.1 Unify impersonation (M2)**
- Remove `impersonateUser` from `SuperAdminService`. All impersonation goes through `AuthService.impersonate()`.
- Standardize token lifetime to `30min` for impersonation everywhere.

**3.2 Fix nested transactions in billing (M3)**
- `billing.service.ts:startFreeTrial()`: Remove the outer `queryRunner`. Let `tenantService.createTenant()` handle its own transaction. The subscription save runs after tenant creation using its repo directly.

**3.3 Fix WBS governance role checking (M4)**
- Replace string arrays `CRITICAL_OVERRIDE_ROLES` with `Role` enum references.

**3.4 Fix findAllChildren N+1 (M5)**
- Replace the recursive loop with a PostgreSQL recursive CTE:
  ```sql
  WITH RECURSIVE tree AS (
    SELECT * FROM wbs_budget WHERE wbs_id = $1
    UNION ALL
    SELECT wb.* FROM wbs_budget wb JOIN tree t ON wb.parent_wbs_id = t.wbs_id
  )
  SELECT * FROM tree WHERE wbs_id != $1
  ```

**3.5 Fix batch expense processing (H11)**
- Replace the sequential loop creating N queryRunners with a single transaction.
- Collect all valid entries, save in bulk, return errors for invalid ones.

**3.6 Add Redis to infrastructure**
- `docker-compose.yml`: Add `redis` service (`redis:7-alpine`).
- Wire `REDIS_URL=redis://redis:6379` to the backend service.

**3.7 Add PgBouncer or switch to Neon serverless driver**
- For 10K+ users: Add `@neondatabase/serverless` driver or configure PgBouncer.
- Raise connection pool limits only after verifying Neon plan accommodates it.

**3.8 Add BullMQ for report generation**
- Move PDF/Excel generation into a job queue (BullMQ + Redis).
- The controller returns `{ jobId }` immediately; client polls `/reports/status/:jobId`.

---

### PHASE 4 â€” Frontend Fixes (â± ~2 days)

**4.1 Fix amount text overflow in dashboard cards (F1, F2)**
- For all KPI card amount values, use `text-2xl` at `xs`/`sm`, `text-3xl` at `md`, `text-4xl` at `lg`.
- Add `truncate` or `line-clamp-1` and a `title` attribute as tooltip fallback.
- Use a shared `<AmountDisplay>` component with responsive sizing logic.

**4.2 Fix chart height on mobile (F6)**
- Wrap all `<ResponsiveContainer>` with a `div` having `minHeight: 200px`.

**4.3 Add AbortController to large page fetch calls (F5)**
- `pages/super/tenants.tsx`: Add `AbortController` pattern to all `useEffect` fetch chains.

**4.4 Add real-time refresh with polling (SuperAdmin)**
- All SuperAdmin dashboard counters should poll every 30 seconds (already done for health, extend to KPIs).

---

### PHASE 5 â€” Complete CEO Dashboard (â± ~3 days)

Build the CEO Dashboard to enterprise standard:

**5.1 Executive KPI Row (6 cards)**
- Total Budgeted | Actual Spent | Committed (LPO) | Variance % | Burn Rate | Est. Exhaustion Date

**5.2 Dual-context OPEX/CAPEX Toggle (wire backend)**
- CAPEX: WBS rollup by project
- OPEX: Operational budget rollup by cost center

**5.3 AI Narrative Insight Panel**
- Call `/reporting/explain-variance` and display the AI summary in a highlighted card.

**5.4 Project Portfolio Health Matrix**
- Table of projects with status badges (On Track / At Risk / Over Budget) based on `burn rate > 80%` threshold.

**5.5 30-Day Spend Trend Chart**
- Use the `history` array from `/dashboard/executive` to render a proper area chart (already returned by backend, not displayed).

**5.6 Cash Flow Exhaustion Countdown**
- Display `estimatedExhaustionDate` as a visual countdown using a progress ring.

**5.7 CEO Annotations Panel**
- Wire the annotation create/view endpoints to a sidebar drawer panel.

**5.8 PDF Export**
- Add "Export Report" button â†’ calls `/reporting/generate?type=CAPEX_SUMMARY&format=pdf`.

---

### PHASE 6 â€” Containerisation (â± ~1 day)

**6.1 Fix backend Dockerfile**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev   # â† Only production deps
COPY --from=build /app/dist ./dist
EXPOSE 3001
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3001/api/v1/auth/health || exit 1
USER node
CMD ["node", "dist/main"]
```

**6.2 Fix docker-compose.yml**
- Add `redis` service
- Add `healthcheck` for backend
- Add `NEXT_PUBLIC_API_URL` build arg to frontend
- Add `uploads` named volume
- Move backend to port `3001` (conflicts with Next.js on 3000)
- Add Nginx reverse proxy config

**6.3 Add `.dockerignore` files**
- Both `backend/` and `frontend/` need `.dockerignore` excluding `node_modules/`, `.env*`, `dist/`, `.next/`.

---

### PHASE 7 â€” Documentation & README (â± ~1 day)

**7.1 Root `README.md`**
- Project description, tech stack diagram, prerequisites, local dev setup, environment variables table, API base URL, quick start commands.

**7.2 `docs/ARCHITECTURE.md`**
- Mermaid system diagram: Browser â†’ Nginx â†’ NestJS â†’ Neon (public schema) + Tenant schemas
- Multi-tenancy model explanation
- Auth flow diagram (JWT cookie lifecycle)
- Payment flow diagram (webhook â†’ tenant provisioning)

**7.3 `docs/API.md`**
- Add NestJS `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to all controllers.
- Enable Swagger UI at `/api/v1/docs` (development only).

**7.4 `docs/DEPLOYMENT.md`**
- Step-by-step Railway deployment guide
- Environment variable reference table
- Database migration procedure

**7.5 `docs/SECURITY.md`**
- JWT lifecycle, token blacklisting
- Role hierarchy diagram
- Multi-tenant isolation guarantee
- Rate limiting thresholds

---

## Summary Table

| Phase | Focus | Priority | Days |
|-------|-------|----------|------|
| 1 | Critical Security Fixes | ðŸ”´ Immediate | 1 |
| 2 | Placeholder Feature Completion | ðŸ”´ Immediate | 2 |
| 3 | Architecture & Performance | ðŸŸ  High | 3 |
| 4 | Frontend Fixes | ðŸŸ  High | 2 |
| 5 | CEO Dashboard Build-out | ðŸŸ¡ Medium | 3 |
| 6 | Containerisation | ðŸŸ¡ Medium | 1 |
| 7 | Documentation & README | ðŸŸ¢ Before Release | 1 |
| **Total** | | | **~13 days** |

---

> **Note:** The `investigated-audit-documents/` directory at the project root contains prior audit artifacts. This plan supersedes and extends those findings.
