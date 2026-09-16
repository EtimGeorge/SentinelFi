# Security Policy

SentinelFi is a multi-tenant financial platform. This file defines:

- what automated security tooling runs (and what is intentionally not run),
- how to report a vulnerability,
- the known-gaps register.

## Supported versions

| Channel | Support |
| --- | --- |
| `master` (main branch) | Production-equivalent, actively protected |
| Release tags | Same branch commit |
| Older branches | Not supported; upgrade to `master` |

Only the `master` branch is deployable. Fixes land on `master` and are
released from it.

## Reporting a vulnerability

**Do NOT open a public issue for anything security-related.**

- Prefer a private report: GitHub **Security → Report a vulnerability**
  (works for any repo; creates a draft advisory limited to collaborators).
- If you have access to the private Slack/Discord channel, ping the
  maintainers directly with the same details.
- Otherwise email the maintainer (`saencrystal.global@gmail.com`) and include
  the string `[SECURITY]` in the subject.

What to include: affected endpoint/component, repro steps, impact, and
(whenever possible) a minimal PoC. We aim to triage within 3 working days.
The [gap register](security/GAPS.md) tracks accepted/deferred findings.

Scope: everything under `backend/`, `frontend/`, `ai-agent/`, `shared/`,
`packages/`, and the CI workflows. Out of scope: the Hugging Face Space
(`sync-ai-agent-to-hf.yml` mirrors `ai-agent/` to
`Saencrystal/sentinelfi_ai`).

## Automated tooling

All of the following run in GitHub Actions on `master` and/or PRs:

| Layer | Tool | Workflow | Gate |
| --- | --- | --- | --- |
| SAST (semgrep, JS/TS rules) | semgrep | `security-pr.yml` (PR) | Warnings surfaced as annotations |
| Secret scanning (full history) | gitleaks | `security-push.yml` (push) | Scans every push; blocks on findings in CI |
| Dependency audit (npm prod deps) | `npm audit` | `security-pr.yml` + `security-push.yml` | **Fails on High/Critical** |
| OSS advisory (lockfiles) | OSV-Scanner | `security-pr.yml` | Advisory report per PR |
| Dependency freshness | dependabot | scheduled (npm root, GitHub Actions, ai-agent pip) | Weekly PRs |
| DAST (authenticated) | OWASP ZAP | `zap-scan.yml` | Compose target on PR; optional `STAGING_URL` deep scan on schedule |
| Runtime IDOR walkthrough | `security/authz-suite.ts` | manual / accepted into scope | Human-gated, run against compose |

Reference: [`security/README.md`](security/README.md) documents how to run
each tool locally. Reports land in `security/zap/reports/` (gitignored).

### What we do NOT run

- **CodeQL** (GitHub default): deliberately disabled — semgrep + osv-scanner +
  gitleaks + dependabot + ZAP cover the same surface with the OSS budget we
  have. See `security-pr.yml`/`security-push.yml` for the active ruleset.
- **ZAP against production**: ZAP is **hard-denied** from contacting
  `sentinel-fi.com` / `sentinelfi.com` / any `https://` target in CI. It only
  ever scans the local compose stack (`http://localhost:3001`) or an explicit
  `STAGING_URL` repo secret. Do not add a `PRODUCTION_URL` secret; this guard
  is a design invariant.

## Key security characteristics

- **Multi-tenancy**: postgres schema-per-tenant, `search_path` switched per
  request; tenant objects are scoped by `TenantAccessGuard`.
- **Auth**: bcrypt password hashing; JWTs as httpOnly cookies; `access_token`
  + `refresh_token`; password reset uses a 32-byte random token stored hashed,
  single-use, 1h expiry.
- **Transport**: helmet + HSTS-style production CSP in `frontend/next.config.js`;
  WS origins validated against `FRONTEND_URL`/`FRONTEND_ALLOWED_ORIGINS`.
- **API**: global rate limiting, PII-masking log interceptor, Joi env schema
  that refuses unknown/malformed configuration at boot.

## Known gaps & accepted deviations

See [`security/GAPS.md`](security/GAPS.md). Highlights:

- `DEV-001` — dev seed passwords are plaintext in source (accepted, dev-only).
- `DEV-002` — password-reset loop depends on email delivery; dev SMTP is a sink
  at 2525 so the loop is not exercised E2E locally (flow itself is implemented).

## Incident response

1. Assume a finding on `master` is exploitable until proven otherwise.
2. Create a private draft advisory; reproduce on the compose stack.
3. Fix on `master` behind a normal PR (CI gates must pass, including ZAP on
   the compose stack).
4. If the fix is a security regression in semantics (`search_path`, authz
   guard, ORM entity pins), add a `@IsIn`, schema pin, or regression unit test
   and record it in `GAPS.md`.

Owners: `@Saencrystal` (maintainer) and the current on-call engineer listed on
the README/operations docs.