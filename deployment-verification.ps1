
# deployment-verification.ps1
# PowerShell script to verify that all critical fixes are properly in place.

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SentinelFi Deployment Verification Script" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host ""

# Use a script-level scope for counters to be accessible inside the function
$script:check_success = 0
$script:check_failure = 0

# Helper function to check for file existence and content
function Check-FileContent {
    param(
        [string]$DisplayName,
        [string]$FilePath,
        [string]$Pattern
    )

    Write-Host -n "Checking $DisplayName... "
    $fullPath = Join-Path $PSScriptRoot $FilePath

    if (-not (Test-Path $fullPath)) {
        Write-Host "✗ FAIL" -ForegroundColor Red
        Write-Host "  - Reason: File not found at '$fullPath'" -ForegroundColor Yellow
        $script:check_failure++
        return
    }

    # Use Select-String for more robust pattern matching
    if (Select-String -Path $fullPath -Pattern $Pattern -Quiet) {
        Write-Host "✓ PASS" -ForegroundColor Green
        $script:check_success++
    } else {
        Write-Host "✗ FAIL" -ForegroundColor Red
        Write-Host "  - Reason: Pattern not found in '$FilePath'" -ForegroundColor Yellow
        Write-Host "  - Pattern: '$Pattern'"
        $script:check_failure++
    }
}

# --- Verification Checks ---

Write-Host '1. BACKEND: DATABASE AND CORE' -ForegroundColor White
Write-Host "-----------------------------"
Check-FileContent -DisplayName "DB Config Exists" -FilePath "backend/src/common/config/database.config.ts" -Pattern "class DatabaseConfig"
Check-FileContent -DisplayName "DB Pool Configured" -FilePath "backend/src/common/config/database.config.ts" -Pattern "max: 20"
Check-FileContent -DisplayName "DB Health Monitoring" -FilePath "backend/src/common/config/database.config.ts" -Pattern "initializeHealthMonitoring"
Check-FileContent -DisplayName "AppModule uses DB Config" -FilePath "backend/src/app.module.ts" -Pattern "DatabaseConfig.getTypeOrmConfig"
Check-FileContent -DisplayName "Main.ts has Graceful Shutdown" -FilePath "backend/src/main.ts" -Pattern "gracefulShutdown"
Check-FileContent -DisplayName "Main.ts has Health Monitor" -FilePath "backend/src/main.ts" -Pattern "DatabaseConfig.initializeHealthMonitoring"
Write-Host ""

Write-Host '2. BACKEND: AUTHENTICATION SERVICE' -ForegroundColor White
Write-Host "------------------------------------"
Check-FileContent -DisplayName "AuthService has LoginCache" -FilePath "backend/src/auth/auth.service.ts" -Pattern "class LoginCache"
Check-FileContent -DisplayName "AuthService uses SafeTransaction" -FilePath "backend/src/auth/auth.service.ts" -Pattern "SafeTransaction.execute"
Check-FileContent -DisplayName "AuthService uses RetryableQuery" -FilePath "backend/src/auth/auth.service.ts" -Pattern "RetryableQuery.execute"
Check-FileContent -DisplayName "AuthService selects password_hash" -FilePath "backend/src/auth/auth.service.ts" -Pattern 'select: \[.*"password_hash".*\]'
Write-Host ""

Write-Host '3. BACKEND: AUTHENTICATION CONTROLLER' -ForegroundColor White
Write-Host "---------------------------------------"
Check-FileContent -DisplayName "AuthController has ResponseHelper" -FilePath "backend/src/auth/auth.controller.ts" -Pattern "class ResponseHelper"
Check-FileContent -DisplayName "AuthController uses manual response" -FilePath "backend/src/auth/auth.controller.ts" -Pattern "ResponseHelper.sendJson"
Check-FileContent -DisplayName "Timeout Interceptor Exists" -FilePath "backend/src/common/interceptors/timeout.interceptor.ts" -Pattern "class TimeoutInterceptor"
Check-FileContent -DisplayName "AuthController uses Interceptor" -FilePath "backend/src/auth/auth.controller.ts" -Pattern "@UseInterceptors\(TimeoutInterceptor\)"
Write-Host ""

Write-Host '4. FRONTEND: API AND AUTHENTICATION' -ForegroundColor White
Write-Host "---------------------------------"
Check-FileContent -DisplayName "Robust API Config (axios)" -FilePath "frontend/lib/api.ts" -Pattern "class RetryHandler"
Check-FileContent -DisplayName "API Client is Exported" -FilePath "frontend/lib/api.ts" -Pattern "export const apiClient"
Check-FileContent -DisplayName "AuthContext has Rate Limiter" -FilePath "frontend/components/context/AuthContext.tsx" -Pattern "class LoginRateLimiter"
Check-FileContent -DisplayName "AuthContext has User Cache" -FilePath "frontend/components/context/AuthContext.tsx" -Pattern "const userCache = new Map"
Check-FileContent -DisplayName "AuthContext uses apiClient" -FilePath "frontend/components/context/AuthContext.tsx" -Pattern "import { apiClient } from '../lib/api'"
Write-Host ""

Write-Host '5. FRONTEND: NEXT.JS CONFIG' -ForegroundColor White
Write-Host "---------------------------"
Check-FileContent -DisplayName "Next.js has Webpack Optimizations" -FilePath "frontend/next.config.js" -Pattern "splitChunks"
Check-FileContent -DisplayName "Next.js has Security Headers" -FilePath "frontend/next.config.js" -Pattern "X-Frame-Options"
Check-FileContent -DisplayName "Next.js has Production Optimizations" -FilePath "frontend/next.config.js" -Pattern "swcMinify: true"
Write-Host ""


# --- Summary ---

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host "Passed: $script:check_success" -ForegroundColor Green
Write-Host "Failed: $script:check_failure" -ForegroundColor Red
Write-Host ""

if ($script:check_failure -eq 0) {
    Write-Host "✓ All checks passed! The codebase reflects the required changes." -ForegroundColor Green
    Write-Host "Ready for the next step: Manual End-to-End Testing."
} else {
    Write-Host "✗ Some checks failed. Please review the errors above before proceeding." -ForegroundColor Red
}
