# SentinelFi — Burp Suite / Proxy Manual IDOR Walkthrough

Companion to `authz-suite.ts` (black-box) and `GAPS.md`. This is the
**operator-driven** version: a human drives a browser through Burp Suite (or
ZAP proxy / mitmproxy) and proves that cross-tenant / cross-role access is
impossible **regardless of what the client sends** — the tenant & role must be
derived from the *verified session*, never from request params the client
controls.

> RLS alone is NOT sufficient. Postgres RLS scopes rows at the DB layer, but
> if the API reads `tenant_id` / `org_id` / `role` from the request body, query
> string, or a caller-controlled header, an attacker can simply *ask* for
> another tenant's scope and RLS happily separates buckets that were never the
> target. The hard rule:
>
> **tenant_id and role are derived from the access token (server-decoded),
> then used as the ONLY input to the scoping guard — never echoed from the
> client, never shadowed by a body field.**

---

## 0. Setup (10 min)

1. Start the compose stack (see `security/HACKING.md` step 1):
   - Frontend `http://localhost:3001`, health `http://localhost:3001/api/v1/health`.
2. Boot Burp (Community is fine) → Proxy → set upstream to `127.0.0.1:8080`.
3. Configure the browser to use the proxy, install the CA cert
   (Burp → Proxy → Options → Import CA → export DER, add to browser trust store).
4. Log in as **Tenant A admin** and **Tenant B admin** in two browser profiles
   (both must be non-MFA tenant admins; see `GAPS.md` DEV-002 note).

## Walkthrough A — JWT payload tampering (IDOR against the token)

1. Proxy the login request for Tenant A. Confirm the response sets
   `access_token` (HttpOnly cookie) + `access_token`/`currentUser` in the JSON
   body.
2. Decode the JWT (see `security/zap/auth-json.mjs` for the decode helper).
   Note the claims: `sub`, `email`, `tenant_id`, `role`, `type`.
3. **Tamper the token body** in the proxy — swap `tenant_id` to Tenant B's id
   and `role` to `superadmin` — WITHOUT re-signing. Send the modified cookie.
   - **Expected (pass):** the API rejects the token (`401 / Invalid token`).
     Signature verification must be strict; no silent downgrade.
   - **Fail:** if the app accepts a modified unsigned/mismatched-signed token,
     JWT secret handling or `verify` options are broken. **This is a critical
     finding.**
4. **Re-sign the tampered token** (only possible if you possess the JWT secret,
   e.g. from a leaked `.env`). This simulates a leaked-secret scenario:
   - Use the SAME algorithm + secret used by the app to forge a token with
     swapped `tenant_id`.
   - **Expected (pass):** the forged token authenticates, BUT the tenant
     scoping guard still only exposes Tenant B's own data (the token IS Tenant B
     now) — and `role: superadmin` still yields 403 for `X-Tenant`-gated
     surfaces unless the caller genuinely is a superadmin in that tenant.
   - **Read:** the app must treat `tenant_id` from the token as an *identity
     claim*, not a *desired scope*.
5. Idempotent replay: resend a captured `access_token` cookie 1:1 from
   Tenant A while logged in as Tenant B.
   - **Expected (pass):** 401/403 — a token minted for A must never be valid
     for B's session revocations.

## Walkthrough B — `org_id` / tenant body-swap (API layer IDOR)

1. Intercept a **create/read expense** request (e.g. `POST /api/v1/wbs/expenses`).
2. Duplicate it in Burp Repeater and swap:
   - `tenantId` / `org_id` in the JSON body,
   - any `projectId` / `costCenterId` in the body,
   - the `X-Tenant-Id` header if present.
3. Send as **Tenant A** acting on **Tenant B's** ids.
   - **Expected (pass):** 404 (not found — do NOT leak existence) or 403.
     A 403 may be acceptable if it is the per-row guard; a 200 with B's rows
     is a critical IDOR.
4. Repeat for `GET /api/v1/projects/<id>`, `PATCH /api/v1/projects/<id>`,
   `DELETE`, and the WBS/expense/report controllers. Every read, mutation, and
   delete must re-derive tenant from the token and intersect with the requested
   id — never trust the id alone.

## Walkthrough C — role escalation

1. Log in as a **reporting user** (read-only role).
2. Proxy a `PATCH /api/v1/settings/...` or project-create request.
3. In Repeater, add `"role": "superadmin"` / `"isSuperAdmin": true` to the body
   and set an `Authorization` header with a **tenant-admin** token.
   - **Expected (pass):** the guard derives role from the token (tenant admin),
     ignores the body role, and returns 403 for superadmin-only surfaces
     (`/super/*`).
   - **Fail:** if body role is honored, that's a privilege-escalation find.

## Automation note

`security/authz-suite.ts` automates the pass/fail assertions for the *running*
stack (logs in two tenants, probes 10+ cross-tenant paths, exits non-zero on
violation). Run it first; use this walkthrough only to investigate failures or
cover endpoints the suite does not reach yet.

```powershell
node security/authz-suite.ts http://localhost:3001
```

## Tighten-through / Follow-up

- Extend `authz-suite.ts` probes as new endpoints land (see its header comment).
- If any walkthrough step FAILS, log it as a GAP (**GAPS.md** format) with
  severity + where (file:line) + the fix, and add a regression test.
- Never commit a leaked JWT secret; the `DEV-001` note applies (dev seed
  creds must be blocked at the auth boundary in production).
