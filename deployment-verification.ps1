
# deployment-verification.ps1
# Simple verification script for SentinelFi.

Write-Output "=========================================="
Write-Output "SentinelFi Deployment Verification (DST)"
Write-Output "=========================================="

$successCount = 0
$failureCount = 0

# Helper function to check for file existence and content
function Test-Pattern {
    param(
        [string]$DisplayName,
        [string]$FilePath,
        [string]$Pattern
    )

    Write-Host "Checking $DisplayName... " -NoNewline
    $fullPath = Join-Path $PSScriptRoot $FilePath
    if (-not (Test-Path $fullPath)) {
        Write-Host "NOT FOUND" -ForegroundColor Red
        $global:failureCount++
        return
    }
    
    $content = Get-Content $fullPath -Raw
    if ($content -match $pattern) {
        Write-Host "PASS" -ForegroundColor Green
        $global:successCount++
    } else {
        Write-Host "FAIL" -ForegroundColor Red
        $global:failureCount++
    }
}

Test-Pattern -DisplayName "DB Config" -FilePath "backend/src/common/config/database.config.ts" -Pattern "class DatabaseConfig"
Test-Pattern -DisplayName "Health Monitor" -FilePath "backend/src/main.ts" -Pattern "DatabaseConfig.initializeHealthMonitoring"
Test-Pattern -DisplayName "Graceful Shutdown" -FilePath "backend/src/main.ts" -Pattern "gracefulShutdown"
Test-Pattern -DisplayName "Forensics" -FilePath "backend/src/common/services/financial-forensics.service.ts" -Pattern "class FinancialForensicsService"
Test-Pattern -DisplayName "WBS-AI" -FilePath "backend/src/wbs/wbs.service.ts" -Pattern "forensicsService"
Test-Pattern -DisplayName "PDF-Cache" -FilePath "backend/src/common/pdf-generation.service.ts" -Pattern "cacheManager"
Test-Pattern -DisplayName "CEO-UI" -FilePath "frontend/pages/dashboard/ceo.tsx" -Pattern "avgDailySpend"

Write-Output ""
Write-Output "SUMMARY: $successCount Passed, $failureCount Failed"

if ($failureCount -eq 0) {
    Write-Host "SUCCESS: System stability verified." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Verification failed." -ForegroundColor Red
    exit 1
}
