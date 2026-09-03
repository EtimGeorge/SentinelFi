# SentinelFi — Implementation Gaps & Remediation Plan
**Date:** 2026-09-02  
**Scope:** UI/UX, Security Architecture, Authentication & Authorization, Access Control, Business Logic, Tests, Health Checks  
**Method:** File-by-file code read (`backend/src`, `frontend/pages|components|lib|store`, `ai-agent/main.py`, `shared/`) cross-checked against `docs/ARCH-*.md` × 8, `MASTER_DOCUMENTATION.md`, `USER_PROCESS_GUIDE.md` and 18 `user-guides/`.  
**Principle:** Complete system functionality + single-responsibility per document/module. Expand genuine gaps, eliminate duplication, optimize scalability/maintainability/auditability. Challenge feature-creep until P0-P2 correctness is closed.

---

## 0. Counterargument — Why Not “More Features Now”

> “Always provide full functionality + add advanced features broadly” conflicts with SRP and with prod readiness.

**Stress test:** Adding bulk-import, drag-drop WBS, FX, Stripe, Ivorypay, per-tenant PDF branding before fixing RBAC bypass (`frontend/components/guards/RouteGuard.tsx:212`), JWT env mismatch (`env-validation.schema.ts:19` vs `jwt.strategy.ts:59`), in-memory blacklist, and missing `middleware.ts` widens attack surface and hides regressions. Neon pool is already 5+5=10 (free tier limit). Each new feature adds tenant-schema DDL divergence (`database.config.ts` 43 entities vs `tenant-migration` 19).

**Decision gate:** Phases 0-2 (P0/P1) must be green (typecheck + `docker-compose` health `/api/v1/health/ready` + RBAC e2e) before Phase 8 advanced features. Advanced items are specced but gated.

---

## 1. Executive Summary

| Dimension | Docs Claim | Code Reality | Verdict |
|-----------|------------|--------------|---------|
| **Security** | Defense-in-depth, 10k concurrent dedup, L1+L2 Redis, JTI blacklist | `InMemoryAuthCache` + `Map` blacklist, no `helmet`/`csrf`, `sameSite:false` invalid | **Insecure for production** |
| **Auth** | Dual cookie/Bearer, 10k dedup | `JWT_SECRET` vs `JWT_SECRET_KEY` mismatch → prod crash; `payload.permissions` trusted from JWT stale | **Broken** |
| **Access Control** | RBAC 11 roles, SuperAdmin non-interference | `RouteGuard.tsx:212` early return makes `/super` guard dead code; no `middleware.ts` | **Bypass** |
| **Tenancy** | Schema-per-tenant `SET search_path` | Correct via `TenancyAwareDataSource` but migration glob diverges; `JwtAuthGuard` swallows DB error | **Partial, fragile** |
| **Resilience** | Circuit breaker 3/30s, soft-delete | In-memory breaker not distributed; `MaintenanceGuard` never registered | **Incomplete** |
| **Health** | `/api/v1/health` enterprise | Single probe mixing liveness/readiness; no frontend probe; no `HEALTHCHECK` | **Missing** |
| **AI Agent** | Modular `workflows/tools/guardrails` | Single `main.py:627`, `allow_origins:["*"]`, `risk_level` mismatch | **Monolith MVP** |
| **Tests** | Enterprise | 1 spec `__tests__/login.spec.tsx` | **Absent** |
| **Docs** | 8 ARCH + guides | ~60% verbatim duplication, committed `shared/dist`, `.agent` SARSI contamination, `file:///c:/temp` links | **Debt** |

---

## 2. System Inventory (Verified)

- **Backend modules (27):** `AppModule` (`backend/src/app.module.ts:72`), `AuthModule`, `TenantModule`, `TenantDatabaseModule` (`@Global` `TENANT_DATA_SOURCE`), `TenantRepositoriesModule` (REQUEST-scoped), `WbsModule`, `ProjectsModule`, `FinanceCoreModule` (OPEX enterprise: FiscalYear/Period, Department/CostCenter, GL, P2P, Payroll), `CurrencyModule`, `MessagingModule` (Socket.io + Redis adapter `backend/src/main.ts:40`), `AiAssistantModule`, `BillingModule`, `HealthModule` (`backend/src/health/health.controller.ts:28` Terminus), + `SuperAdminModule`, `MarketingModule`, etc. Pool unified 5 + tenant 5.
- **Guards (APP_GUARD order):** `ThrottlerGuard` (10/60s `app.module.ts:84`) → `JwtAuthGuard` (cookie `access_token` + Bearer, checks `TenantEntity.is_active/expires_at` → 403/402) → `TenancyGuard` (CLS `SCHEMA_NAME` 5min `SCHEMA_CACHE`) → `TenantAccessGuard` (blocks `params.tenantId` mismatch; SuperAdmin bypass). Per-route: `RolesGuard` (SuperAdmin non-interference), `PermissionsGuard`, `FeatureFlagGuard`. `MaintenanceGuard` dead code.
- **Interceptors (APP_INTERCEPTOR):** `CorrelationInterceptor` (x-correlation-id → CLS, slow >1s warn) + `LogSanitizationInterceptor` (`[MASKED]` for `password/secret/…`).
- **Frontend pages (80):** `pages/_app.tsx` (`AuthProvider→Breadcrumb→Currency→RouteGuard`), public/marketing, `login/register/forgot`, `dashboard/{home,ceo}`, `financials/{projects/wbs/budgets/expenses}`, `financials/operations/{manage,planning,procurement,payroll}`, `reporting/*`, `admin/*`, `super/*`, legal, `api/proxy-currency-rates.ts` sole API route. `next.config.js:51` rewrites `/api/v1/:path*` → `BACKEND_INTERNAL_URL`.
- **Frontend auth:** `components/context/AuthContext.tsx:737` (INITIALIZING/AUTHENTICATED/SYNCING state machine, `localStorage sentinelfi_auth_user` TTL 24h, dedup `globalDeduplicator` + `authCircuitBreaker` 3×30s, `BroadcastChannel` multi-tab sync, 5min heartbeat `GET /auth/me`). `store/globalStore.ts` + `store/uiStore.ts` (WebSocket `ws://localhost:3001/ws-notifications` hard-coded).
- **AI Agent:** `ai-agent/main.py` (FastAPI 9 routes: `/api/v1/ai/{chat,analyze-dashboard,forecast,explain-section,fill-form,generate-report,schedule-report,generate-report-narrative}`, `SecurityGuardrail` 13 HARD_BLOCK + 4 REDIRECT regex, `AIProviderManager` OpenRouter→Gemini fallback, `slowapi` 30/m).

---

## 3. Gaps by Dimension (Prioritized P0 → P3, with file:line)

### 3.1 UI/UX — `USER_INTERFACE_GUIDE.md`, `frontend/DESIGN_SYSTEM.md` vs Code

| ID | Gap | Evidence | Impact | Fix (Owner) |
|----|-----|----------|--------|-------------|
| UX-P0-01 | **RBAC display-only, guard bypass** — tenant can navigate to `/super/tenants` | `RouteGuard.tsx:212` `setAuthorized(true); return;` makes lines 216-227 dead code; duplicate `Header.tsx` vs `LayoutNav.tsx` | Privilege escalation | Remove early return, restore `if(currentPath.startsWith('/super')&&!hasSuperAdminRole) redirect`, add `middleware.ts` edge guard |
| UX-P0-02 | **No Edge Middleware** — all protection CSR, flash of shell | `Glob **/middleware.* →0` | SEO leak, FOUC | `frontend/middleware.ts` reads `access_token` cookie, matches `PUBLIC_ROUTES` regex, redirects |
| UX-P0-03 | **Missing deps break isolated build** | `frontend/package.json:8` no `zustand/axios/lucide-react/react-icons/uuid` yet imported (`store/`, `lib/api.ts:1`) | Docker `frontend` stage fails | Pin `zustand ^5.0.9, axios ^1.13, lucide-react ^0.562, react-icons ^5.5, uuid ^13 + @types` |
| UX-P1-01 | **No ErrorBoundary / 500** — chart crash white-screen | Only `_error.tsx:61`, `404.tsx`, no `500.tsx`, no `ErrorBoundary.tsx` | No isolation | Wrap `SecuredLayoutUI.tsx` with boundary, add `pages/500.tsx` |
| UX-P1-02 | **Tailwind purge holes + light mode absent** | `tailwind.config.js` content misses `contexts/hooks/store`; `darkMode:'class'` but no toggle | Missing styles in prod | Add globs + theme toggle; sync `DESIGN_SYSTEM.md` tokens (`brand-dark #0B0F1A` vs doc `#1E293B`) |
| UX-P1-03 | **Hard-coded secrets/paths** | `frontend/pages/index.tsx:80` `file:///C:/Users/...`, `store/uiStore.ts:74` `ws://localhost:3001` | Prod 404/WS fail | Use `NEXT_PUBLIC_WS_URL` + `location.host` wss, Next `Image` |
| UX-P2-01 | **Duplicate nav/contexts cache leak** | `components/context/AuthContext.tsx` vs `contexts/TourContext.tsx`, `lib/navigationMap.ts` caching not cleared on logout | Stale nav | Dedupe to single `contexts/AuthContext`, call `clearNavigationCache()` on login/logout |
| UX-P2-02 | **`hasPermission`/`RequirePermission` stubs** | `components/context/AuthContext.tsx:222` `hasPermission` returns false except SuperAdmin; `hooks/useAuthHooks.tsx:215` never sets `canAccess` | Permission gates always deny | Implement real check vs `user.permissions` JWT array, add guard tests |
| UX-P2-03 | **A11y** | No `skip-link`, sidebar `aria-modal` only mobile, variance color-only | Non-compliant | Add a11y pass, icon+text for variance flags |

**Advanced UX to gate (Phase 8):** Design tokens script (`tailwind.config.js` → `DESIGN_SYSTEM.md`), print-optimized budget previews already good, `TutorialFab+TourOverlay` guided tours—expand to role-aware checklists.

---

### 3.2 Security Architecture

| ID | Gap | File | Fix |
|----|-----|------|-----|
| SEC-P0-01 | **Joi key mismatch prod crash** | `env-validation.schema.ts:19` `JWT_SECRET` required but `jwt.strategy.ts:59` reads `JWT_SECRET_KEY` | Unify to `JWT_SECRET`, `Joi.string().min(64).required()`, update `JwtModule` + `messaging.service` |
| SEC-P0-02 | **No Helmet/HPP/CSP** | `main.ts:29` only 3 headers via `next.config.js:80` | Add `helmet` (HSTS, CSP, X-Frame DENY), `hpp`, body limit `json({limit:'10mb'})` |
| SEC-P0-03 | **CSRF missing + insecure cookie** | `main.ts` `cookieParser()` no `csurf`; `AuthContext` `sameSite:false` invalid; `CORS credentials:true` origin string not array | Add `csurf` double-submit + `sameSite:lax` in dev / `none+secure` prod, whitelist array origins |
| SEC-P0-04 | **In-memory blacklist/cache not distributed** | `auth/token-blacklist.service.ts` Map, `jwt.strategy.ts:101` `IAuthCache` InMemory fallback | Redis `SET jti TTL` (exp), Lua atomic check; `RedisAuthCache` default when `REDIS_URL` |
| SEC-P0-05 | **PII masking incomplete + exception leak** | `LogSanitizationInterceptor` misses nested arrays; `AllExceptionsFilter.ts:25` leaks new CID, logs at warn | Recursive scrub, reuse `getCorrelationId()`, `CorrelatedLogger` everywhere |
| SEC-P1-01 | **CacheModule fails closed on Redis down** | `app.module.ts:90` `redisStore` throws | Graceful fallback to InMemory + retry, log `REDIS_UNAVAILABLE` |
| SEC-P1-02 | **Health AI import circular risk** | `health.controller.ts:12` imports `AiAssistantModule` | Use `HealthIndicator` without full module or forwardRef |

---

### 3.3 Authentication & Authorization

| ID | Gap | Detail | Fix |
|----|-----|--------|-----|
| AUTH-P0-01 | **Permissions not refreshed from DB** | `jwt.strategy.ts:153` `permissions: payload.permissions` trusts stale JWT | On `findOne is_active` also load `roles.permissions`, recompute, overwrite payload |
| AUTH-P0-02 | **Password hash cache 5min + LoginCache 3s** hides timing | `auth.service.ts:96` `passwordHashCache` Map stale on reset | Evict on `resetPassword`, bound size, never use cache for invalid password |
| AUTH-P0-03 | **No refresh token / silent renewal** | `AuthContext.tsx` 30min timeout but `handleLogoutNow` no-op | Add `refresh_token` httpOnly rotation, `POST /auth/refresh`, silent 401 retry with dedup |
| AUTH-P1-01 | **Impersonation 4h token, empty perms** | `auth.service.ts:176` `permissions:[]` | Resolve target tenant perms via `roles.permissions`, audit `IMPERSONATION_START/END` already done—add `impersonator_id` claim verification in `RolesGuard` |
| AUTH-P1-02 | **Password reset dual storage** | `auth/user.entity.ts` legacy `resetPasswordToken` columns + `password-reset.entity.ts` | Remove legacy cols, keep `PasswordResetEntity` hashed SHA256 1h + `is_consumed` |

---

### 3.4 Access Control (Tenancy + RBAC)

| ID | Detail | File | Fix |
|----|--------|------|-----|
| AC-P0-01 | **Tenant isolation bypass on DB error** | `auth/guards/jwt-auth.guard.ts` `catch{}` silently allows expired/suspended tenant | Fail-closed: on DB error → 503 + `Retry-After`, never grant |
| AC-P0-02 | **MaintenanceGuard dead** | `common/guards/maintenance.guard.ts` not in `APP_GUARD` | Register `APP_GUARD` after `TenantAccessGuard`, allow `SuperAdmin` + `/api/v1/super*` |
| AC-P1-01 | **Schema migration divergence** | `tenant-migration.service.ts` 19 entities vs `DatabaseConfig.getEntities` 43 | Single source `getTenantEntities()`, CLI `npm run migrations:sync-tenants` (planned in `DATABASE_OPERATIONS.md`) |
| AC-P1-02 | **`TenantAccessGuard` log spam** | `tenant-access.guard.ts` `Access GRANTED` at `log` per request | `verbose` level, add correlation |
| AC-P1-03 | **FeatureFlagGuard settings auto-create for SuperAdmin bypass** | `auth/guards/feature-flag.guard.ts` | Guard `!tenantId` early return |

---

### 3.5 Business Logic & Financial Intelligence

| Module | Gap | Spec vs Code | Remediation (Single-Responsibility) |
|--------|-----|--------------|-------------------------------------|
| **WBS** | Bulk import + drag-drop marked `Coming Soon` in `docs/user-guides/07-WBS-DESIGNER.md` but pitch claims done | `wbs.service.ts` CTE rollups exist; `WbsCategoryModal.tsx` + `WBSImportModal.tsx` UI partial | Finish `POST /wbs/import` Excel (exceljs) transactional, `TenantCacheInterceptor` 600s → 1h per `ARCH-004` with auto-invalidate on `LiveExpense` write; e2e `shared/utils/wbs.ts` rollup tests |
| **OPEX** | Payroll auto-burn from monthly allocation, period allocations | `OperationalBudgetsModule` (legacy) + `FinanceCoreModule` (enterprise) duplicate | **Eliminate duplication:** deprecate `operational-budgets/*` re-exporting to `finance-core/*`, or feature-flag; implement `PayrollService` split% validation + `budget-ledger` burn trigger |
| **DOA/Governance** | DOA 4 tiers $0/$20k/$100k/unlimited, USD normalization | `ARCH-005` claims `CurrencyService` spot rate but `shared/utils/currency.ts` only `Intl.Format`; `DoaService/BudgetControlService` hardcoded thresholds 85%/100% | Implement `CurrencyService` FX API (ECB) + `exchange_rate` table cache 1h; `BudgetControlService` variance OK/WARNING/CRITICAL per `ARCH-004` burn logic |
| **Reporting** | Per-tenant branding (logo/color/address) + 10 WBS templates (IT/Construction/Oil …) vs `industry.enum.ts` MINING mismatch | `reporting/reporting.service.ts` `Puppeteer+Handlebars+pdf-lib` already; MD5 PDF cache key includes timestamp → defeats `<10ms` | Content-hash without timestamp, Redis cache; reconcile 10 templates JSON `backend/src/wbs/data/templates/` with `Industry` enum |
| **Billing/Payments** | Strategy `PAYSTACK/PAYPAL/IVORYPAY` (HMAC) vs PRD `Stripe` | `billing/webhook.service.ts` + `ProcessedWebhookEntity` idempotency correct; `payment/webhook.controller.ts` duplicate | Choose provider matrix: Paystack (NGN, `x-paystack-signature`) primary + PayPal + Ivorypay extension; Stripe only if self-serve roadmap Phase 3—single `PaymentStrategy` interface |
| **Notifications** | `ARCH-006` raw `ws` `/ws-notifications` future room scoping | `messaging.gateway.ts` Socket.io + `NotificationsService` global broadcast | Scope rooms `tenant:${id}:user:${id}`, persist `notifications` table, offline retrieval `GET /notifications?since=` |
| **Search/Audit** | `SearchService` global search, `AuditModule` fire-and-forget | No retry, soft-delete manual SQL | Add `audit_logs` public schema immutable + `audit` Redis stream queue for retry; `ReportScheduleEntity` vs `ai-audit-log.entity` duplicate |

---

### 3.6 Tests & Quality

| Gap | Evidence | Target |
|-----|----------|--------|
| No unit/e2e | `frontend/__tests__/login.spec.tsx` only; `backend/jest.config.js` 0 suites pass | 70% coverage: `JwtStrategy` dedup (50 concurrent), `RouteGuard` matrix (public/private/super), `api.ts RetryHandler` 3× jitter, `tenant-aware-data-source` `SET search_path`, `payment webhook` HMAC |
| No CI health gate | `package.json:22` `typeorm:*` scripts but no `test:ci` | `npm run typecheck-all` + `lint-all` + `test --coverage` + `docker health` in GitHub Actions |

---

### 3.7 Health Checks & Resilience

| Gap | Current `health.controller.ts:28` | Required |
|-----|-----------------------------------|----------|
| Liveness vs readiness conflated | Single `GET /health` checks DB+AI+Redis+memory+circuit | Split: `GET /health/live` (heap 150MB/RSS 300MB, uptime) → K8s liveness; `GET /health/ready` (DB ping 3s, Redis, AI ping, circuit) → readiness. Add `GET /health/deep` with auth (tenancy). Add `frontend/pages/api/health.ts` + `Dockerfile HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3000/api/health` |
| Circuit breaker not distributed | `AiAssistantService` in-memory 3/30s | Redis state or `nestjs-bull` queue; expose `GET /health/circuit` |
| Keep-alive 45s but no probe | `DatabaseConfig.startKeepAliveScheduler` | Expose metrics `GET /metrics` (pool active/idle, `connectionCircuitBreaker`) |
| Correlation desync | `AllExceptionsFilter` new UUID | Propagate `X-Correlation-ID`/`X-Request-ID` end-to-end (frontend `lib/api.ts:73` generates, backend `CorrelationInterceptor` mirrors) |

---

## 4. Documentation Refactor (Eliminate Duplication)

**Keep single responsibility per doc:**

| Doc | Owns | Remove From Others |
|-----|------|-------------------|
| `ARCH-001-SECURITY.md` | Auth/JWT, PII `[MASKED]`, blacklist | DUP in ARCH-007, DEVELOPER_GUIDE, USER_INTERFACE_GUIDE—replace with cross-link |
| `ARCH-002-TENANCY.md` | Schema-per-tenant, `TenancyAwareDataSource`, migrations | DUP in STRUCTURE_MAP, DATABASE_OPERATIONS, INVESTOR_PITCH—link |
| `ARCH-003-RESILIENCE.md` | Circuit breaker, `AllExceptionsFilter`, soft-delete | DUP in OPERATOR_MANUAL—link |
| `ARCH-004-FINANCIAL-INTELLIGENCE.md` | Forensics burn/exhaustion, `TenantCacheInterceptor`, PDF MD5 | DUP in user-guides 02/03—trim guides to user steps only |
| `MASTER_DOCUMENTATION.md` | Index only | Remove `file:///c:/temp/...` absolutes, point to relative `./ARCH-*.md` |
| `docs/user-guides/*` (18) | Click paths only, no ARCH restatement | Strip repeated DOA/variance definitions, keep `00-QUICK-START` as ToC |

**Actions:** delete `shared/dist` from git (`git rm -r --cached shared/dist`, `.gitignore`), quarantine `.agent/rules/hallmark-part1.md` (200KB design slop) + `.agents/workflows/sarsi-system-message.md` (NDPA NGO swarm)—move to `_archive/external-contamination/` or delete; fix `deployment-logs-for-back4app.md:635` `COPY failed` by root `Dockerfile` context `shared/` include.

---

## 5. Phased Execution (4 Weeks, Gated)

### Week 1 — P0 Security & Access (Block Release)
1. `frontend/middleware.ts` (edge) + fix `RouteGuard.tsx:212` + tests.
2. Unify `JWT_SECRET` (Joi `.min(64)`) + update `jwt.strategy.ts`, `auth.module`, `messaging.gateway`.
3. `helmet` + `hpp` + `csurf` + CORS array + `sameSite` fix (`backend/src/main.ts:29`).
4. Redis `TokenBlacklist` + `RedisAuthCache` default (`backend/src/auth/auth-cache.ts`).
5. Frontend deps pin + `docker-compose.yml` ports standardize (frontend 3000, backend 3001) — fix `README:32` vs `MASTER:41`.

**Exit: `docker-compose up --build` boots; `curl /api/v1/health/ready` ok; e2e RBAC matrix passes.**

### Week 2 — Resilience & Health
6. Split health (`health.controller.ts`) + frontend `pages/api/health.ts` + `HEALTHCHECK` in `Dockerfile`×3.
7. Register `MaintenanceGuard`, fix `CacheModule` fallback, fix `AllExceptionsFilter` CID.
8. Unify entities `DatabaseConfig.getTenantEntities()`, run `tenant_migrations` parity check on Neon 10-conn limit.

### Week 3 — Business Logic Dedup
9. Deprecate `operational-budgets` → `finance-core`, implement `CurrencyService` FX cache, `DoaService` thresholds per `ARCH-005`.
10. `ai-agent` modularize `ai-agent/app/` (guardrails, workflows, tools) + fix CORS `allow_origins` from env, align `risk_level` to `ARCH-004` (CRITICAL <7d/100%, WARNING <30d/85%).
11. Notifications room scoping + `notifications` table + audit retry queue.

### Week 4 — Tests, Docs, Advanced (Gated)
12. Jest + Playwright coverage 70% (auth, tenancy, billing webhook idempotency).
13. Doc dedup + `STRUCTURE_MAP.md` link fix + `shared/dist` purge + `.dockerignore` update.
14. **Gate check:** If P0-P2 green, spec advanced: tenant-branded Puppeteer reports (MD5 without timestamp), 10 WBS templates sync, FX multi-currency in `CurrencySelector.tsx`, paystack→ivorypay strategy.

---

## 6. File-Level Patch Checklist (Directly Actionable)

- `backend/src/common/config/env-validation.schema.ts:15` `REDIS_HOST: required+default` contradictory → make optional + default, add `REDIS_URL` alternative.
- `backend/src/health/health.controller.ts:48` `ai_circuit_breaker` duplicate with `http.pingCheck`—consolidate.
- `backend/src/common/interceptors/log-sanitization.interceptor.ts` log `debug` JSON.stringify on Puppeteer PDFs → cap size or `truncate 5kb`.
- `backend/package.json` missing `@nestjs/common/bcryptjs/passport/typeorm` (reliant on root hoist) → copy to `backend/package.json` for standalone `backend/Dockerfile`.
- `frontend/next.config.js:80` headers add `Strict-Transport-Security`, `Content-Security-Policy` (or via backend `helmet`).
- `frontend/lib/api.ts:54` `validateStatus 200<400` treats 3xx as success—change to `200<300`.
- `frontend/store/uiStore.ts:74` `WebSocket` native vs `socket.io-client` `services/messaging.service.ts:56`—choose one.
- `ai-agent/requirements.txt` pin `langchain-google-genai==1.0.7` etc., already; add `pytest`.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Redis mandatory breaks local dev | `REDIS_URL` optional in dev → InMemory fallback + warning log; prod requires env and fails fast with Joi message |
| Migration drift on Neon free 10 conns | Dual pools capped 5 each already correct; add `statement_timeout 25s` already—keep |
| Audit loss on fire-and-forget | Queue + background worker + `audit_logs` `UNLOGGED`? No—logged table with retry 3× |
| Frontend refresh token rotation CSRF | `httpOnly secure sameSite=none` + `Origin` check + short lived 15min + 7d refresh |

---

## 8. Verification (Before Merge per Task)

```bash
npm run typecheck-all          # shared + frontend + backend
npm run lint-all
npm run typeorm:public:run && npm run typeorm:tenant:run
docker-compose up -d --build && curl -H "X-Correlation-ID: test" http://localhost:3001/api/v1/health/ready
npx playwright test --project=rbac --grep "/super"
pytest ai-agent/tests/ -q
```

K8s probes:
```yaml
livenessProbe: { httpGet: { path: /api/v1/health/live, port: 3001 }, periodSeconds: 30 }
readinessProbe: { httpGet: { path: /api/v1/health/ready, port: 3001 }, periodSeconds: 10 }
```

---

## 9. Session Memory — Key Paths Indexed

`backend/src/app.module.ts:177`, `main.ts:125`, `auth/jwt.strategy.ts:190`, `auth/auth.service.ts:1485`, `common/guards/*`, `common/interceptors/*`, `common/filters/all-exceptions.filter.ts:58`, `database/tenancy-aware-data-source.ts`, `health/health.controller.ts:58`, `frontend/components/context/AuthContext.tsx:737`, `components/guards/RouteGuard.tsx:250` (P0), `lib/api.ts:225`, `lib/resilience.ts:155`, `next.config.js:108`, `ai-agent/main.py:627`, `shared/types/role.enum.ts`. All read into session for follow-up implementation.

---

*Precision. Resilience. Intelligence. — Plan committed for gated execution.*

