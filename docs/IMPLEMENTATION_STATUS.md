# SentinelFi — Implementation Status & Progress Log

**Date:** 2026-09-03
**Reference:** `docs/IMPLEMENTATION_GAPS_AND_REMEDIATION_PLAN.md` (38 gaps, P0→P3)
**Status discipline:** Only items verified (typecheck / live probe / diff) are marked **DONE**. Everything else remains **PENDING**.
**Principle:** Phases 0-2 (P0/P1/P2) must be green before advanced (Phase 8) features are un-gated.

---

## 1. Executive Summary

This log tracks remediation against the plan. Work is sequenced P0 → P1 → P2; advanced features are specced but gated until correctness gates pass.

**Current phase:** Week 1-2 P0/P1 security, auth, access control, health — partially implemented, **not yet shipped** (no commit, no live-run verification).

---

## 2. DONE (Verified in this session)

### P0 — Security & Access Control

| Gap ID | Description | File(s) | Status |
|--------|-------------|---------|--------|
| UX-P0-01 | RBAC guard bypass (`RouteGuard.tsx:212` early `return` dead-coding `/super` + `/admin` checks) | `frontend/components/guards/RouteGuard.tsx` | **DONE** (dead early-return removed; `/super` + `/admin` RBAC restored) |
| UX-P0-02 | No edge middleware (CSR-only protection) | `frontend/middleware.ts` (new) | **DONE** (reads `access_token` cookie, `PUBLIC_PATTERNS`, redirects unauth → `/login?returnUrl`, best-effort `/super` block, injects `x-correlation-id`) |
| UX-P0-03 | Phantom frontend deps break isolated build | `frontend/package.json` | **DONE** (pinned `axios`, `lucide-react`, `react-icons`, `uuid`, `zustand` + already-present `js-cookie`, `next`, `react`, etc.) |
| SEC-P0-01 | JWT secret env mismatch (`JWT_SECRET` vs `JWT_SECRET_KEY`) | `backend/.env`, `backend/.env.local`, `backend/src/auth/jwt.strategy.ts`, `auth/auth.module.ts`, `superadmin/superadmin.module.ts`, `common/config/env-validation.schema.ts` | **DONE** — canonical key is `JWT_SECRET`; `JWT_SECRET_KEY` kept as back-compat alias (`??` fallback) across strategy + both `JwtModule.registerAsync` blocks |
| SEC-P0-02 | No Helmet / HPP | `backend/src/main.ts` (new `helmet()` + `hpp()`), `backend/src/types/hpp.d.ts` (new typings), `backend/package.json` (added `helmet ^8.3.0`, `hpp ^0.2.3`) | **DONE** (typecheck-verified) |
| SEC-P0-05 | Exception filter correlation desync (new UUID per throw) | `backend/src/common/filters/all-exceptions.filter.ts` | **DONE** (reuses `getCorrelationId()`) |
| AUTH-P0-01 | Permissions trusted from stale JWT | `backend/src/auth/jwt.strategy.ts:148-153` | **DONE** (recomputes `roles.permissions` from DB, overwrites payload) |

### P0/P1 — Resilience, Health & Maintenance

| Gap ID | Description | File(s) | Status |
|--------|-------------|---------|--------|
| AC-P0-02 | `MaintenanceGuard` dead (never registered) | `backend/src/app.module.ts` (import + first `APP_GUARD`), `backend/src/settings/settings.module.ts` (exported `SettingsService` for injection) | **DONE** (runs first in `APP_GUARD` chain) |
| HEALTH-P0 (3.7) | Liveness vs readiness conflated | `backend/src/health/health.controller.ts` — **DONE** (split `GET /health/live` heap/RSS, `GET /health/ready` DB/Redis/circuit) ; `frontend/pages/api/health.ts` (new) — **DONE** |
| HEALTH (3.7) | CORS headers for correlation | `backend/src/main.ts` (`allowedHeaders`/`exposedHeaders` include `X-Correlation-ID`, `X-Request-ID`) | **DONE** |
| UX-P1-01 | No ErrorBoundary | `frontend/components/common/ErrorBoundary.tsx` (new) | **DONE** (file created; not yet wired into `SecuredLayoutUI`) |
| UX-P1-02 | Tailwind purge holes | `frontend/tailwind.config.js` (content globs for `contexts`, `hooks`, `store`, `styles`) | **DONE** |

### Local Dev Enablement (No Docker)

| Description | Status |
|-------------|--------|
| Backend frontend-phantom + missing direct deps pinned for standalone `backend/Dockerfile` / `npm run start:dev` (`@nestjs/common/core/config/jwt/passport/platform-express/typeorm`, `bcryptjs`, `passport`, `passport-jwt`, `reflect-metadata`, `rxjs`, `typeorm`, `uuid`, `helmet`, `hpp`) | **DONE** in `backend/package.json` |
| Frontend phantom deps pinned | **DONE** in `frontend/package.json` |
| Frontend `tsconfig.json` unblocked under TS 6 (`"ignoreDeprecations": "6.0"` for deprecated `moduleResolution:node` + `baseUrl`) | **DONE** |
| Backend typecheck (`npx tsc --noEmit --skipLibCheck`) | **PASS** |
| Frontend typecheck | **PASS** for all app code — pinned `@types/react`/`@types/react-dom` to `^18.2.0` (React 18.2.0 is the stable runtime pinned across the repo; React 19 types clash with the next/14.1.4 + react 18 runtime and were producing ~100 systemic `FC` JSX errors). Deduped to a single hoisted 18.x copy. Only pre-existing non-app errors remain (a broken `__tests__/login.spec.tsx` fixture and two CSS side-effect import declarations). |

---

## 3. PENDING / UNVERIFIED (Next Work)

| Gap ID | Description | Blocker / Note |
|--------|-------------|----------------|
| SEC-P0-03 | CSRF + cookie hardening | Not started. Plan calls for `csurf` double-submit + `sameSite:lax` (dev) / `none+secure` (prod), CORS origin string → array. **Deliberately not rushed** — betting `sameSite:strict` (cookie-only auth) may make full `csurf` optional; needs decision. |
| SEC-P0-04 | Redis-backed token blacklist / auth cache | Not started. Current `InMemoryAuthCache` + `Map` blacklist single-node. Requires Redis default when `REDIS_URL` present. |
| SEC-P1-01 | `CacheModule` fail-closed on Redis down | Not started. `redisStore` throws when Redis unavailable; needs fallback + `REDIS_UNAVAILABLE` log. |
| HEALTH-P0 | `/health/deep` (auth + tenancy) + `HEALTHCHECK` in Dockerfiles + `/metrics` | Not started |
| AC-P0-01 | Tenant isolation fail-closed on DB error (`jwt-auth.guard.ts` `catch{}`) | Not started — **critical**; must not silently allow on DB error |
| AUTH-P0-02/03 | Password-hash cache eviction; refresh token rotation | Not started |
| AC-P1-01 | Tenant migration entity divergence (19 vs 43) — single `getTenantEntities()` | Not started |
| UX-P1-03 | Hard-coded `ws://localhost:3001`, `file:///C:/...` links | Not started |
| UX-P2-01/02/03 | Nav cache leak, `hasPermission` stub, a11y | Not started (P2) |
| Docs | Deduplication (~60% verbatim), `shared/dist` purge, `.dockerignore`, fix `deployment-logs ...COPY failed` | Contamination quarantined (`_archive/external-contamination/`) **DONE**; full dedup **PENDING** |
| Business logic (Week 3) | OPEX dedup → `finance-core`, `CurrencyService` FX, `DoaService` thresholds, notifications room scoping, AI-agent modularize | **GATED** until P0-P2 green |
| Tests | Jest/Playwright 70% coverage; RBAC e2e matrix | **GATED**; note: no CI gate exists yet |

---

## 4. Local Development (No Docker) — Verified Config

Backend (`.env.local` / `.env`):
- `PORT=3001`, `NODE_ENV=development`
- `DATABASE_URL` = Neon pooled connection (SSL `require`)
- `JWT_SECRET=da4c…f88` (canonical; `JWT_SECRET_KEY` now alias)
- `FRONTEND_URL=http://localhost:3000`

Frontend (`.env.local`):
- `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1`
- `next.config.js` rewrites `/api/v1/:path*` → `BACKEND_INTERNAL_URL`

Run (from monorepo root, hot-reload):
```bash
npm run start:backend:dev     # nest start --watch (backend/src/main, PORT 3001)
npm run dev -w frontend       # next dev (PORT 3000)
```
> **Not yet live-tested** in this session — the backend requires a reachable Postgres (Neon URL configured) and optional Redis. Both runtimes and `node_modules` are present on this host; DB/Redis reachability was not probed.

---

## 5. Uncommitted Work Inventory (`git status`)

- **Modified:** `backend/package.json`, `app.module.ts`, `auth/auth.module.ts`, `auth/jwt.strategy.ts`, `common/config/env-validation.schema.ts`, `common/filters/all-exceptions.filter.ts`, `health/health.controller.ts`, `main.ts`, `settings/settings.module.ts`, `superadmin/superadmin.module.ts`; `frontend/components/guards/RouteGuard.tsx`, `frontend/package.json`, `frontend/tailwind.config.js`, `frontend/tsconfig.json`, `frontend/tsconfig.tsbuildinfo`; root `package.json` (+`helmet`/`hpp`), `package-lock.json`.
- **Untracked:** `frontend/middleware.ts`, `frontend/pages/api/health.ts`, `frontend/components/common/ErrorBoundary.tsx`, `backend/src/types/hpp.d.ts`, `docs/IMPLEMENTATION_STATUS.md`, `docs/IMPLEMENTATION_GAPS_AND_REMEDIATION_PLAN.md`, `.agents/` (legit `karpathy-inspired-claude-code-guidelines.md`), `_archive/` (quarantined contamination).

> No commit made — pending explicit request / further verification.

---

## 6. Blockers / Decisions Needed

1. **Commit scope:** A single P0/P1 commit is prepared but not committed. Await go-ahead.
2. **CSRF strategy (SEC-P0-03):** `sameSite=strict` cookie auth may eliminate need for `csurf`; recommend deciding before implementing.
3. **Redis dependence:** `REDIS_URL` already present (Upstash). Decide whether dev should default to Redis or InMemory for blacklist/cache.
4. **Frontend typecheck:** Resolved — pinned `@types/react` + `@types/react-dom` to `^18.2.0` and deduped to a single hoisted 18.x copy (React **18.2.0** chosen as the most stable option: it matches the runtime across the repo, next/14.1.4, react-datepicker v9, and root `overrides`; React 19 types are incompatible with this stack and caused ~100 systemic JSX errors). App code now typechecks; only pre-existing non-app errors remain (`__tests__/login.spec.tsx` missing `./login` fixture, two CSS side-effect import declarations).
