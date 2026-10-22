# SentinelFi — Security & Implementation Gap Register

**Originally audited:** 2026-09-02
**Re-audited:** 2026-10-22 (verified against current code, not the previous doc)
**Scope:** Security architecture, authentication/authorization, access control, tests, health/resilience.

> **Why this file was rewritten.** The 2026-09-02 version listed several "P0" issues that had
> since been fixed in code. Treating it as a live bug list wasted effort and caused false alarm
> (e.g. "RBAC bypass", "JWT env mismatch", "no helmet"). This version is a **verified register**:
> every status below was checked against the current files at the cited locations. Do not add a
> row here without a `file:line` evidence check.

---

## 1. Verified FIXED (do not re-open without new evidence)

| ID | Original claim | Current evidence | Status |
|----|----------------|------------------|--------|
| AUTH-P0-01 | JWT `permissions` trusted from payload (stale) | `backend/src/auth/jwt.strategy.ts:186-191` recomputes permissions from DB `roles.permissions` | Fixed |
| AUTH-P0-02 | `JWT_SECRET` required but code read `JWT_SECRET_KEY` → prod crash | `jwt.strategy.ts:62` and `auth.module.ts:45-46` read `JWT_SECRET ?? JWT_SECRET_KEY`; schema accepts both (`env-validation.schema.ts:20-26`) | Fixed |
| SEC-P0-02 | No Helmet/HPP/CSP/body limit | `backend/src/main.ts:54-85` — helmet (HSTS+CSP in prod), hpp, `json({limit:"100kb"})`, Permissions-Policy | Fixed |
| SEC-P0-05 | PII masking missed nested arrays | `common/interceptors/log-sanitization.interceptor.ts:55-70` sanitizes arrays + nested objects recursively | Fixed |
| SEC-P1-01 | CacheModule fails closed when Redis down | `app.module.ts:191+` catches Redis errors and falls back to in-memory with a warning | Fixed |
| AC-P0-01 | `JwtAuthGuard` swallowed DB errors (fail-open) | `auth/guards/jwt-auth.guard.ts:201-219` fails **closed** with 503 + `Retry-After` | Fixed |
| AC-P0-02 | `MaintenanceGuard` never registered | `app.module.ts:276-277` — registered as 4th `APP_GUARD` | Fixed |
| SEC-P0-01 / UX-P0-01 | `/super` RBAC guard was dead code (`RouteGuard.tsx:212`) | Live check: non-SuperAdmin redirected (`components/guards/RouteGuard.tsx`, "SuperAdmin-only routes" block); `frontend/middleware.ts` exists | Fixed |
| UX-P0-02 | No edge middleware | `frontend/middleware.ts` exists | Fixed |
| UX-P0-03 | Missing frontend deps / unsafe doc rendering | `react-markdown` present, **no** `rehype-raw`, **no** `dangerouslySetInnerHTML` | Fixed |
| UX-P1-01 | No 500 page / no error boundary | `components/common/ErrorBoundary.tsx` wired in `pages/_app.tsx:248`; `pages/500.tsx` added in this pass | Fixed |
| UX-P1-03 | Hard-coded `ws://localhost` / `file:///C:/...` | Centralized in `lib/ws-url.ts` (env override `NEXT_PUBLIC_WS_URL`); `store/uiStore.ts:2` uses it; no `file:///C:` literals remain | Fixed |
| Health | Single probe conflating liveness/readiness | `health/health.controller.ts` exposes `GET health`, `GET health/live`, `GET health/ready` | Fixed |
| Tests | "1 spec, absent" | 49 backend `*.spec.ts`, 8 frontend test files (verified by file count) | Stale — closed |
| AI CORS | `allow_origins:["*"]` | `ai-agent/main.py:558-559` uses an `allowed_origins` allowlist | Verify on deploy |

---

## 2. OPEN items (verified still present)

### P0 / P1

| ID | Gap | Evidence | Recommended fix |
|----|-----|----------|-----------------|
| AUTH-P0-03 | Token blacklist was **in-memory only** (multi-replica revocation not shared) | `auth/token-blacklist.service.ts` | **Implemented this pass** (see §3): Redis-backed when `NODE_ENV=production` or `USE_REDIS=true` with `CACHE_MANAGER`; in-memory fallback otherwise. Requires Redis in prod to be effective. |
| SEC-P0-03 | CSRF relied on `SameSite=Lax` alone; CORS `origin` was a single string (one frontend only) | `main.ts` CORS block | **Implemented this pass** (see §3): multi-origin CORS allowlist + Origin/Referer check on cookie-authenticated state-changing requests. |
| AC-P1-01 | Tenant-migration entity list may diverge from runtime entity set | No `getTenantEntities()` single-source helper found | Build parity check (`npm run migrations:sync-tenants`) and a CI test comparing sets. Not attempted here — needs schema review. |
| SEC-P1-02 | Health controller imports `AiAssistantModule` (circular-init risk) | `health/health.controller.ts` | Extract a lightweight `HealthIndicator`; low urgency if boot is stable. |
| AUTH-P1-02 | Password reset data in two places (legacy columns + `PasswordResetEntity`) | `auth/user.entity.ts`, `auth/entities/password-reset.entity.ts` | Drop legacy columns in a migration after confirming no readers. |

### P2 / P3 (backlog; not release-blocking)

| ID | Gap | Evidence | Note |
|----|-----|----------|------|
| PERF | `RedisAuthCache.set` passed TTL in **seconds** to cache-manager v7 (expects **ms**) | `auth/auth-cache.ts` | **Fixed in this pass** — entries were expiring ~1000× early (perf only, not security). |
| OBS | `LogSanitizationInterceptor` has no payload size cap | `log-sanitization.interceptor.ts` | Large PDF/media logs can be noisy; truncate to ~5 KB. |
| FEAT | Billing provider matrix (Paystack/PayPal; Stripe not built) | `billing/webhook.service.ts`, `payment/*` | Keep `payment/` module unregistered (`payment.module.ts` intentionally dead). Add a provider only after the P0 set is green. |
| DOC | Some docs still duplicate ARCH content | `docs/ARCH-*.md`, `docs/user-guides/*` | Deduplicate to a single owner per topic; link rather than restate. |

---

## 3. Changes made in the 2026-10-22 pass

1. **`backend/src/auth/token-blacklist.service.ts`** — now dual-backend:
   - Redis when `NODE_ENV=production` or `USE_REDIS=true` **and** a shared `CACHE_MANAGER` exists.
   - Falls back to the local `Map` on Redis write failure (never silently drop a revocation).
   - `blacklist()` / `isBlacklisted()` are now `async`; call sites updated:
     `auth/jwt.strategy.ts:103` and `auth/auth.service.ts:911`.
2. **`backend/src/auth/auth-cache.ts`** — corrected TTL unit (`ttlSeconds * 1000`) for cache-manager v7.
3. **`backend/src/main.ts`** —
   - CORS accepts `FRONTEND_URL` + comma-separated `FRONTEND_ALLOWED_ORIGINS` (normalized, deduped).
   - Added CSRF Origin/Referer validation for cookie-authenticated `POST/PUT/PATCH/DELETE`
     (Bearer clients and webhooks are unaffected; `SameSite=Lax` remains the primary control).
4. **`frontend/pages/500.tsx`** — branded 500 page (ErrorBoundary already wrapped the app).

**Scaling note:** the Redis blacklist only helps if production actually sets `REDIS_URL`
(and Redis is reachable). Confirm this in the deploy environment; otherwise revocations remain
node-local (bounded by token `exp`).

---

## 4. Decision gate (updated)

Advanced/platform features (bulk import, FX, Stripe/Ivorypay, branded PDFs) stay gated until:

1. `npx tsc --noEmit` (frontend) and backend tsc are clean.
2. `docker compose` boots and `GET /api/v1/health/ready` returns healthy.
3. RBAC matrix e2e passes (`/super` inaccessible to tenant roles).
4. **Redis is configured in production** (required for distributed blacklist + cache).

The previous doc's "Neon pool 5+5=10 (free-tier limit)" remains a hard constraint on concurrent
connections — not a bug, but a deployment limit to respect.

---

## 5. Verification commands

```bash
# Backend
npx tsc --noEmit -p backend/tsconfig.json
npx jest --config backend/jest.config.js --runInBand

# Frontend
cd frontend && npx tsc --noEmit
npm test --workspace frontend
npx next lint

# Runtime
docker compose up -d --build
curl -fsS http://localhost:3001/api/v1/health/ready
```

---

## 6. Removed from the previous version (obsolete / incorrect)

These rows were deleted because they were **wrong at the time of re-audit**, not merely done:

- "RBAC bypass at `RouteGuard.tsx:212`" — line 212 is no longer an early return; the `/super` guard is live.
- "JWT env mismatch `env-validation.schema.ts:19` vs `jwt.strategy.ts:59`" — both read `JWT_SECRET` with a `JWT_SECRET_KEY` fallback.
- "No `helmet`/`hpp`/body limit" — all present in `main.ts`.
- "`MaintenanceGuard` dead code" — registered.
- "`JwtAuthGuard` catch swallows errors" — now fail-closed 503.
- "No `middleware.ts`" — file exists.
- "`ws://localhost:3001` / `file:///C:/...` hard-coded" — centralized / removed.
- "Tests absent (1 spec)" — 49 backend specs + 8 frontend test files.
- "Health is one mixed probe" — `/live` and `/ready` are split.

*Last verified: 2026-10-22.*
