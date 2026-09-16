# SentinelFi — Known Security Gaps & Deviations (gap register)

This file is the authoritative list of known, accepted, or deferred security
gaps. Each entry: **ID**, **severity**, **status**, **owner**. Fix when it turns
up in a ZAP/Burp scan and the fix is cheap to land.

---

## DEV-001 — Dev seed passwords are plaintext in source

- **Severity:** Medium (dev-only surface, but committed to git)
- **Status:** Accept (documented); tighten before any shared/staging deployment
- **Where:** `backend/scripts/setup-test-tenants.ts` (`TestPass2026!Solar`,
  `TestPass2026!Crystal`); also referenced in seed superadmin paths.
- **Why it exists:** Idempotent local/dev tenant bootstrap requires a known
  credential to run the app and integration tests.
- **Risk:** If a shared staging DB is seeded with these, they are public.
- **Action:** Keep dev credentials out of `.env.prod`; block these exact
  passwords at the auth boundary in production (password policy check).

## DEV-002 — `resetPassword` flow depends on email delivery; token in email link

- **Severity:** Low/Medium
- **Status:** Accept (documented)
- **Where:** `backend/src/auth/auth.service.ts` `requestPasswordReset()`,
  `resetPassword()`.
- **Detail:** Token is 32-byte random, stored hashed, expires in 1h, single-use,
  and the reset URL is embedded in an HTML email. In local dev the SMTP server
  is a dev sink (port 2525), so the “forgot password” loop cannot be exercised
  end-to-end locally — the link never reaches a real inbox.
- **Risk:** Not a vuln; an availability gap in dev. In production the token in a
  link is acceptable practice (HTTPS assumed); the loop IS implemented.
- **Action:** For automated tests, use a MailHog/ethereal sink and read the link
  from the sink; do not weaken token handling.

## SEC-001 (fixed) — `SettingsEntity` unresolved in tenant `search_path`

- **Severity:** High (production 500 for one tenant)
- **Status:** FIXED — see `backend/src/settings/settings.entity.ts` pin to
  `schema: "public"`.
- **Detail:** `TenancyAwareDataSource` sets `search_path` per request; the
  global singleton `settings` entity was unpinned, so tenant-authenticated
  requests resolved to a legacy per-tenant `settings` table lacking
  `gracePeriodDays`/`archiveRetentionDays`.

## SEC-002 (fixed) — WBS `sortBy=wbs_code` crashed paginated GET

- **Severity:** Medium (500 on a core list endpoint)
- **Status:** FIXED — `backend/src/wbs/wbs.service.ts` bypasses TypeORM’s
  dotted-order-key alias split via `addSelect(..., "wbs_sort_key")`.

## SEC-003 (fixed) — ORDER BY injection vector in WBS / live-expense sorting

- **Severity:** Medium
- **Status:** FIXED — `@IsIn` allowlists in both DTOs plus service-side rechecks.

---

## Tooling / automation status

- See `security/zap/` for authenticated ZAP scanning (compose target
  `http://localhost:3001`, optional `STAGING_URL` in CI).
- Reports are generated under `security/zap/reports/` (gitignored).
- IDOR/authorization walkthrough: `security/authz-suite.ts`.