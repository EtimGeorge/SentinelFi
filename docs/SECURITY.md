# SentinelFi Security Review — Findings & Fixes (2026-10-04)

> Scope: full-stack static review + targeted unit verification.
> Live exploit traffic was deliberately NOT run against the Neon-backed dev
> backend. Assurance order: unit tests -> static review -> opt-in live
> probing on localhost with a scratch tenant.
> Fixed this batch: SEC-2026-001 (deleted legacy unsigned webhook),
> SEC-2026-002/003 (webhook signature hardening + tests).

## 1. Test-coverage audit — every feature vs every test

Backend has 26 controllers; specs cover ~8 surfaces.
Covered: billing webhook service (13/13, this batch), tenant-access guard,
tenancy-aware datasource, database config, plus service-level partials
(auth, currency, search, audit RLS, wbs import util, 2 migration specs).

| Controller | Prefix | Spec? | Verdict |
|---|---|---|---|
| auth/auth.controller.ts | /auth | service-only | GAP — no controller test for throttle, cookie flags, MFA branch |
| billing/billing.controller.ts | /billing | — | GAP |
| billing/subscription.controller.ts | /billing | subscription.controller.spec.ts (9 tests) | COVERED — tenant-isolation: 4 public delegate + 5 JWT-scoped; hostile body/query tenant_id cannot steer |
| billing/webhook.controller.ts | /billing/webhook | webhook.service.spec.ts PASS | COVERED |
| ads/ads.controller.ts | /ads | — | GAP |
| ai-assistant/ai-assistant.controller.ts | /ai | — | GAP |
| audit/audit.controller.ts | /audit | RLS only | PARTIAL |
| clients/client.controller.ts | /clients | — | GAP |
| currency/currency.controller.ts | /currency | service only | PARTIAL |
| dashboard/dashboard.controller.ts | /dashboard | — | GAP |
| email/email.controller.ts | /email | — | GAP |
| finance-core + payroll | /finance | — | GAP |
| health/health.controller.ts | /health | — | GAP — public surface, assert no PII leak |
| marketing/marketing.controller.ts | /marketing | — | GAP |
| messaging controller + gateway | /messaging + WS | — | GAP — WS auth untested |
| notifications controller + gateway | /notifications + WS | — | GAP — see SEC-2026-006 |
| operational-budgets | /operational-budgets | — | GAP |
| projects/projects.controller.ts | /projects | — | GAP |
| reporting/reporting.controller.ts | /reporting | — | GAP |
| search/search.controller.ts | /search | service only | PARTIAL |
| settings + tenant-settings | /settings | — | GAP |
| superadmin/superadmin.controller.ts | /superadmin | — | GAP — most privileged surface |
| tenants/tenant.controller.ts | /tenants | — | GAP |
| wbs (+ ai, dcs) | /wbs | util only | PARTIAL |

Frontend suites cover DataTable, WBSImportModal, exportCsv,
academyProgress, curriculum, marketing-analytics, middleware.
Gaps: auth cookie flow, billing success polling, impersonation banner,
notification WS client, role-gated /super + /admin routes.

AI agent (ai-agent/main.py): no Python test suite found.
Needs contract tests for /draft-budget + /variance + model-outage shape.

## 2. Findings register (part 1 — fixed + billing/superadmin)

### SEC-2026-001 — Legacy unsigned webhook (FIXED) — Critical
Was: payment/webhook.controller.ts accepted unsigned JSON, logged
body.event, returned {received:true} with verify-signature TODO.
Fix: file DELETED; payment.module.ts controllers: []. Canonical surface is
billing/webhook/* (HMAC + PayPal verify + idempotency).

### SEC-2026-002 — Paystack timing oracle (FIXED) — High
Was: hash !== signature. Fix: timingSafeEqual + length guard,
missing-sig -> 403, malformed JSON -> 403. Proof: 13/13 green, tsc clean.

### SEC-2026-003 — PayPal header trust + replay (FIXED) — High
Fix: certUrl allowlist (https + api paypal hosts), time window 15min,
algo allowlist, missing id -> 403, dup insert -> false.
Wart: http:// log prints bare hostname; fix message later (frozen).

### SEC-2026-004 — Subscription tenant-isolation (PARTIALLY FIXED) + public-abuse hardening (OPEN) — High
Controller layer: 9/9 tenant-isolation tests written
(subscription.controller.spec.ts — 4 public delegate + 5 JWT-scoped,
hostile body/query tenant_id cannot steer). Jest run PENDING — terminal
wedged, not yet green-proven.
Still OPEN at service layer: startFreeTrial/startFreePlan/
processPublicSubscription take raw bodies with no DTO validation;
@Throttle(3/min) is per-instance (no Redis store) so distributed trial
farming bypasses it. Need: DTO validation tests + throttle-store decision
+ ref-enum test for getSubscriptionStatus.

### SEC-2026-005 — SuperAdmin zero tests — High (OPEN)
impersonate() mints JWT as another user. No spec: cannot hit SuperAdmin,
impersonator_id present, stop restores, audit both ends.
Need superadmin.controller.spec.ts + impersonation spec.

### SEC-2026-006 — Notifications WS unauthenticated — High (OPEN)
notifications.gateway.ts /ws-notifications accepts conns, broadcasts every
tenant's alerts to ALL clients. CORS is origin-only, not identity.
Need JWT handshake (4401), tenant rooms, per-room emit. No new WS features
(presence/typing) before auth exists.

### SEC-2026-007 — Health deep probe overexposed — Medium (OPEN)
/deep + /metrics are @Public(), leak memory/uptime/circuit/AI reachability.
Gate behind SuperAdmin or ops token; test 401 + no PII publicly.

### SEC-2026-008 — Messaging WS auth gap — Medium (OPEN)
HTTP JWT-gated, WS handshake untested. Verify tenant_id scoping in
messaging.gateway.ts or cross-tenant reads possible. Need gateway spec.

### SEC-2026-009 — Auth controller untested — Medium (OPEN)
Cookie flags, MFA branch, rememberMe TTL, refresh-failure clearing — all
untested. Need auth.controller.spec.ts pinning flags + branches.

### SEC-2026-010 — AI-agent boundary untested — Medium (OPEN)
No contract test on timeout / bad schema / agent-down. Need
ai-assistant.service.spec.ts with mocked HTTP (degrade, 502, circuit).

### SEC-2026-011 — Tenancy guard chain (ACCEPTED) — Low/Medium
JwtAuthGuard + TenancyGuard + TenantAccessGuard correct depth; param-mismatch
covered by existing spec. Residual stale-JWT risk bounded by token_version.

## 3. Hack-test log (static + unit, no live traffic)
PASS forged/missing Paystack sig -> 403; malformed JSON -> 403; replay ->
deduped false; PayPal missing headers/id, evil cert, stale time, MD5 algo
-> 403; cross-tenant param -> blocked. OPEN: WS no-auth, trial farming,
impersonation (read-only). SKIPPED live Neon payloads (DNS EAI_AGAIN).

## 4. Changed this batch
M billing/webhook.service.ts; ?? billing/webhook.service.spec.ts (13 green);
D payment/webhook.controller.ts; M payment.module.ts; ?? docs/SECURITY.md;
?? billing/subscription.controller.spec.ts (9 tests written — jest run
PENDING, terminal wedged).
Untouched worktree mods (not mine): ai-agent/main.py, jest.config.js,
migrations, wbs/messaging files, ChatWidget, WBSImportModal, wbs.tsx.

## 5. Next order
1 subscription.spec (004). 2 superadmin.spec (005). 3 WS auth (006/008).
4 gate /deep+/metrics (007). 5 auth.controller.spec (009).
6 ai-assistant.service.spec (010). 7 live localhost probing opt-in.


