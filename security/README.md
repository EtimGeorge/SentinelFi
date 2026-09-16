# SentinelFi — Security Tooling

Docker/CI-based OWASP ZAP scanning, an authorization (IDOR) walkthrough suite,
and the known-gaps register.

| Path | Purpose |
| --- | --- |
| `zap/zap-scan.ps1` | **Primary** ZAP runner (Windows/PowerShell-first) |
| `zap/zap-scan.sh`  | ZAP runner (Linux/macOS) |
| `zap/zap.yaml`     | ZAP Automation Framework plan |
| `zap/zap-auth.js`  | ZAP auth script — tenant login `{email, password, tenantId}` |
| `zap/auth-json.mjs`| Standalone login helper (prints the session cookie) |
| `authz-suite.ts`   | IDOR / tenant-boundary walkthrough against a running stack |
| `GAPS.md`          | Known & fixed security gaps (deviations register) |
| `reports/`         | Scan output (gitignored) |

## ZAP scans

Target the **compose** frontend origin `http://localhost:3001` (compose maps
backend 3000→3001, frontend 3001→3001). Use a **tenant admin** (non-SuperAdmin)
that is not MFA-enforced — `/super/*` returns 403 for tenant users, which is
expected.

```powershell
# Windows (docker daemon running)
.\security\zap\zap-scan.ps1 -Target http://localhost:3001 `
  -Email saencrystal.global@gmail.com -Password '<pw>' -TenantId solution_energy

# Linux/macOS
./security/zap/zap-scan.sh -t http://localhost:3001 \
  -e saencrystal.global@gmail.com -p '<pw>' -i solution_energy
```

Reports land in `security/zap/reports/zap-report.{html,json}`.

### Safety guard

Both runners **refuse to scan non-local hosts** unless a force flag is passed
(`-AllowProd` / `-a`). The GitHub `zap-scan.yml` workflow additionally
**hard-denies** any target on `sentinel-fi.com` / `sentinelfi.com` and only runs
deep scans against the `STAGING_URL` repo secret on `workflow_dispatch` +
schedule.

### If MFA blocks login

The auth script expects a normal `200` login (`access_token` cookie). Accounts
with `requiresMFA` fail fast with a clear message — pick a tenant admin without
MFA, or pre-provision a dedicated scan user.

## authz-suite.ts

Node/`fetch`-based walkthrough of cross-tenant access attempts (IDOR), dead
simple to run after booting compose:

```powershell
node -r ts-node/register security/authz-suite.ts http://localhost:3001
```

## Gap register

See `GAPS.md`. It is the single source of truth for accepted/deferred
deviations (e.g. plaintext dev seed passwords, dev-reset email sink) plus the
record of fixed findings (settings schema pin, WBS sort crash + ORDER BY
injection hardening).