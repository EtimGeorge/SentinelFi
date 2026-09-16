<#
.SYNOPSIS
  Runs an authenticated OWASP ZAP baseline scan against a SentinelFi deployment
  (spider + passive + active) using the ZAP Automation Framework in Docker.

.DESCRIPTION
  Scans TARGET_URL as a tenant admin (email/password/tenantId). Produces
  HTML + JSON reports under <repo>/security/zap/reports/.

  SAFETY GUARD: by default refuses to scan hosts that look like production.
  Override only when you really mean it: -AllowProd.

.EXAMPLE
  .\zap-scan.ps1 -Target http://localhost:3001 -Email saencrystal.global@gmail.com -Password '<pw>' -TenantId solution_energy

.PARAMETER Target
  Base URL of the deployment to scan (e.g. http://localhost:3001).
.PARAMETER Email / Password / TenantId
  Tenant credentials used to authenticate the scan.
.PARAMETER AllowProd
  If set, permits scanning hosts that are NOT localhost (dangerous).
#>
param(
  [string]$Target = "http://localhost:3001",
  [string]$Email,
  [string]$Password,
  [string]$TenantId,
  [switch]$AllowProd
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$zapDir = $PSScriptRoot
$reportDir = Join-Path $zapDir "reports"

# --- Production host denylist guard -------------------------------------
$prodMarkers = @("sentinel-fi.com", "sentinelfi.com", "https://", "vercel.app")
$isLocal = $Target -match "localhost|127\.0\.0\.1|::1|\.local"
if (-not $isLocal -and -not $AllowProd) {
  throw "TARGET '$Target' is not a local host and -AllowProd was not set. Refusing to scan."
}
if ($isLocal -and $AllowProd) {
  Write-Warning "-AllowProd set on a local target; continuing as requested."
}

if (-not $Email -or -not $Password -or -not $TenantId) {
  throw "Email, Password and TenantId are required (authenticated scan)."
}

# --- Docker / ZAP availability -------------------------------------------
try { $zapImage = "ghcr.io/zaproxy/zaproxy:stable" } catch {}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required to run ZAP."
}

New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

# --- Render the automation plan from the template ------------------------
$planPath = Join-Path $zapDir "zap.yaml"
$rendered = Get-Content $planPath -Raw
$rendered = $rendered -replace [regex]::Escape("{{TARGET_URL}}"), $Target `
                      -replace [regex]::Escape("{{ZAP_EMAIL}}"), ($Email) `
                      -replace [regex]::Escape("{{ZAP_PASSWORD}}"), ($Password) `
                      -replace [regex]::Escape("{{ZAP_TENANTID}}"), ($TenantId) `
                      -replace [regex]::Escape("{{ZAP_REPORT_DIR}}"), ("/zap/wrk/reports")
$renderedPlan = Join-Path $reportDir "zap-plan.yml"
Set-Content -Path $renderedPlan -Value $rendered -Encoding utf8

# --- Run ZAP (Automation Framework, in Docker) -----------------------------
$dockerArgs = @(
  "run", "--rm",
  "-v", "$($zapDir):/zap/scripts:ro",
  "-v", "$($reportDir):/zap/wrk/reports",
  $zapImage,
  "zap.sh", "-cmd", "-autorun", "/zap/wrk/reports/zap-plan.yml"
)

Write-Host "Running ZAP scan against $Target (Docker)..."
& docker $dockerArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "ZAP scan exited with code $LASTEXITCODE."
}

Write-Host ""
Write-Host "Reports written to:"
Write-Host "  $reportDir\zap-report.html"
Write-Host "  $reportDir\zap-report.json"
Write-Host ""
Write-Host "Next: review alerts, then re-run locally after fixes."