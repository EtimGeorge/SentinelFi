# HACKING SentinelFi — local security engineering field guide

Companion to [`security/README.md`](../security/README.md) and the
[gap register](GAPS.md). Everything here is tested to run on **Windows /
PowerShell first** (the repo's primary dev OS), with `bash` equivalents.

## 1. Boot a scanable stack

The compose stack maps frontend to `http://localhost:3001` and the backend
internally to `http://backend:3001` (internally), exposing it also at
`http://localhost:3001/api`.

```powershell
# Docker daemon must be running (Docker Desktop).
Copy-Item .env.example .env.prod   # or a real staging .env.prod
docker compose up -d --build       # db, redis, backend, frontend, ai-agent
```

Requires a `.env.prod` (gitignored) with at least:

```dotenv
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:root@localhost:5432/sentinelfi
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random>
```

Landing pages:

| Service | URL |
| --- | --- |
| Frontend (SPA) | `http://localhost:3001` |
| Backend health | `http://localhost:3001/api/v1/health` |
| Swagger (dev) | `http://localhost:3001/api/v1/docs` |
| AI agent | `http://localhost:8000/docs` |

Verify with `curl http://localhost:3001/api/v1/health` — a 503 that lists only
`ai-agent`/`redis` down is expected on a bare compose boot; `database: up` is
the signal.

## 2. Seed a scan user

Tenant logins live in `backend/scripts/setup-test-tenants.ts` (see
`DEV-001`). Provision against the compose DB:

```powershell
npm run db:seed:roles-permissions
npm run db:setup-test-tenants
```

Then use one **tenant admin** (not SuperAdmin) as the ZAP auth user:

```powershell
.\security\zap\zap-scan.ps1 -Target http://localhost:3001 -Email saencrystal.global@gmail.com -Password "<pw>" -TenantId solution_energy
```

## 3. Standalone login helper

`security/zap/auth-json.mjs` prints the session cookie + decoded user for
scripts/locust/hammering:

```powershell
node .\security\zap\auth-json.mjs -b http://localhost:3001 -e saencrystal.global@gmail.com -p "<pw>" -i solution_energy
```

## 4. IDOR walkthrough

`security/authz-suite.ts` logs in two tenant admins and black-box-probes
cross-tenant reachability (each must fail closed):

```powershell
node .\security\authz-suite.ts http://localhost:3001
```

Env overrides: `AUTH_EMAIL_A/PASS_A/TENANT_A` (tenant A, default
`solution_energy`), `AUTH_EMAIL_B/PASS_B/TENANT_B` (tenant B). Returns non-zero
on any violation. Extend `probes` as endpoints land.

## 5. SAST + secrets + deps (mirrors CI)

```powershell
# semgrep — needs `pip install semgrep` or Docker
docker run --rm -v "$(pwd):/src" returntocorp/semgrep semgrep scan --config "p/semgrep-rule-lints-javascript" --config "p/typescript" --config "p/javascript" /src

# gitleaks against full history
gitleaks detect --source . --log-opts="--all" --redact

# deps
npm audit --audit-level=high -w sentinelfi-monorepo
npx osv-scanner --recursive package-lock.json
```

## 6. Hardening invariants to preserve

- **Settings schema pin**: `SettingsEntity` MUST stay pinned to
  `schema: "public"` (`backend/src/settings/settings.entity.ts`). Introduced
  `TenancyAwareDataSource.search_path` made the unpinned entity resolve to a
  stale per-tenant table (SEC-001). Any new global singleton entity needs the
  same pin.
- **ORDER BY input**: every sort column must pass a `@IsIn` on the DTO and be
  re-checked in the service. Dotted/aliased sort keys need an explicit
  `addSelect(...) AS alias` (SEC-002/003).
- **WS origins**: `NotificationsGateway.allowedOrigins` is built from
  `FRONTEND_URL` + `FRONTEND_ALLOWED_ORIGINS`, evaluated lazily so ConfigModule
  has loaded. Do not reintroduce a static origin list.
- **CSP**: production CSP in `frontend/next.config.js` uses `SELF_ORIGIN` and
  `WSHOST` derived from env. Keep `'unsafe-eval'`/`'unsafe-inline'` scoped to
  dev-only if possible; never touch `object-src 'none'`/`frame-ancestors`.
- **ZAP prod deny**: `zap-scan.yml` and both runners refuse non-local /
  `https://` / `sentinel*` hosts. This is a design invariant — do not add a
  prod scan path.

## 7. Test hygiene before pushing

```powershell
npx tsc --noEmit                      # frontend (sequential!)
npx tsc --noEmit -p backend/tsconfig.json
npm run test:ci -w frontend           # jest CI mode (non-watch)
npm run test:ci -w backend
npm run lint -w frontend              # incl. sentinelfi design guardrail
npm run lint -w backend
```

Run **sequentially** — parallel tsc/jest on this machine surfaces phantom parse
errors.

## 8. Gap register

Anything new you find goes to `security/GAPS.md` (not a ticket). Format:

```markdown
## SEC-XXX — <one line>
- **Severity:** <High/Medium/Low>
- **Status:** <Open / Accept (why) / FIXED — pointer>
- **Where:** file:line
- **Action:** what removes it
```

Close it out (status FIXED + regressions test + section in SECURITY.md) when
you land the fix.