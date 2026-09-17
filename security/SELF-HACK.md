# SentinelFi — 30-Minute Self-Hack Checklist

Companion to `IDOR-PLAYBOOK.md` and `authz-suite.ts`. The goal: answer
**"can an attacker who has one valid tenant session read or mutate another
tenant's (or the platform's) data?"** in half an hour. Stop the clock
whenever a check FAILS — that is a finding.

Prereqs (alreadâ€_set up in README): compose stack up at `http://localhost:3001`,
Burp/mitmproxy configured, **two tenant admin accounts** (A + B) seeded via
`npm run db:setup-test-tenants`.

> Guardrail: dev seed creds are in `GAPS.md → DEV-001`. They are NOT magic —
> they exist so YOU can run this. Never drop them into a shared/staging commit.

---

## 0:00 — Warm-up (90 s)

1. `curl.exe http://localhost:3001/api/v1/health` — must return 200 + `database: up`.
2. Prove the app trusts the **session**, not the body: log in as A, replay the
   login response's `access_token` cookie against `/api/v1/dashboard` → 200.
3. Drop the cookie, replay the body-only login → must be 401/403.

## 0:03 — Cross-tenant object-ID tamper (the big one)

1. As A, list projects → copy one `id`.
2. Temporarily change tenants to B; in Repeater open
   `GET /api/v1/projects/<A's id>` with B's token.
   - **PASS:** 403/404 and the body must NOT reveal A data.
   - **FAIL (CRITICAL):** 200 with A's project → IDOR.

3. Repeat once for the **mutating** verbs on the same id (`PATCH`, `DELETE`)
   and for the WBS/expenses/reporting/approvals list+detail endpoints whose
   `projectId`/`costCenterId`/`reportId` come from the URL or query.

## 0:12 — Header / body tenant escalation

1. In the A session, append `X-Tenant-Id: <B>` (and/or
   `tenantId`/`tenant_id`/`orgId`/`org_id` in the JSON body) — send to an
   endpoint that reads tenant from request metadata.
   - **PASS:** response is scoped to A regardless (or a clean 403/400).
   - **FAIL (HIGH):** the API honored the client-supplied tenant = tenant
     spoofing.

2. Repeat with `"role": "superadmin"` / `"isSuperAdmin": true` in the body
   aimed at a `/super/*` path. Must be 403; a 200/204 = role escalation.

## 0:20 — JWT payload tamper (token-level)

1. Decode your `access_token` (ASCII-safe: `node -e
   "console.log(Buffer.from('<token>.'.split('.')[1],'base64url').toString())"`
   or the `security/zap/auth-json.mjs` helper).
2. Change `tenant_id` → B's, or `role` → `superadmin`, **without re-signing**,
   in Burp → send.
   - **PASS:** 401 invalid-signature (the app verifies signature, not just
     decodes).
   - **FAIL (CRITICAL):** a tampered-but-unsigned token was trusted → the JWT
     verify is misconfigured (algorithm confusion / `verify:false`).

3. Re-sign the SAME payload using the dev `JWT_SECRET` from `backend/.env`
   (local-only!).
   - **PASS:** 200 as B — BUT the guard derives the tenant from the token, so
     B only sees B's data. Re-run cross-tenant check; still 403.
   - **FAIL:** resigning to B then reading A's rows = critical authz hole.

## 0:27 — Post-scan: where do I file it? (2 min)

Any FAIL lands in **`GAPS.md`** (SEC-###) + a regression probe in
`security/authz-suite.ts` (section "Tenant B idor …"). Then fix, re-run
`npm run security:authz` + the four verify gates, and push.

If everything PASSED: you've re-validated the RLS + token-guard baseline. Still
record it as a dated line in `GAPS.md` ("walkthrough executed, no findings"),
so a future auditor knows this was covered, not assumed.

Done. Total cost: ~30 min, $0.
