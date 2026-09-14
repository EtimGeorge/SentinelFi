# ARCH-004: Predictive Financial Intelligence Hub

## 1. Overview
The Financial Intelligence Hub provides SentinelFi with enterprise-grade predictive forensics. It transforms raw expense data into actionable insights, including burn-rate velocity, budget exhaustion projections, and automated risk assessment.

---

## 2. Core Components

### 2.1 Financial Forensics Service (`FinancialForensicsService`)
The brain of the intelligence suite. It uses 30-day historical trends to project future state.
- **Burn-Rate Velocity**: Percentage of total budget consumed relative to time survived.
- **Exhaustion Date**: ISO-8601 projection of when the current budget will reach zero based on daily average spend.
- **Risk Assessment**:
    - **CRITICAL**: < 7 days remaining or > 100% burn (overrun).
    - **WARNING**: < 30 days remaining or > 85% burn.
    - **HEALTHY**: Sustainable trajectory.

### 2.2 Reporting Engine (`WbsService` & `PdfGenerationService`)
A high-performance document generation pipeline.
- **AI Insight Reports**: Generates narrative-driven PDF summaries of project health, combining forensics with AI recommendations.
- **Expense Ledger Reports**: Generates detailed project-specific audit logs.
- **Word Utility Integration**: Support for high-fidelity DOCX export with automated variance labeling.

---

## 3. Performance Architecture

### 3.1 Tenant-Aware Caching
High-traffic financial rollups (e.g., `getWbsBudgetRollup`) are protected by the `TenantCacheInterceptor`.
- **Key Strategy**: `tenant:{tenantId}:wbs:rollup:{projectId}`.
- **TTL**: 1 Hour (standard).
- **Invalidation**: Automatically invalidates on new expense logs or budget updates.

### 3.2 Content-Addressed PDF Caching
To minimize expensive Puppeteer rendering, PDF reports use a content-aware caching strategy.
- **Mechanism**: The system generates an MD5 hash of the final HTML template content.
- **Benefit**: Identical report requests (same data, same template) are served from memory/Redis in < 10ms.

---

## 4. Frontend Integration

### 4.1 CEO Dashboard
The CEO view surface global or project-specific forensics:
- **Daily Spend KPI**: Real-time average burn.
- **Exhaustion Timeline**: Visual countdown to budget depletion.
- **Dynamic Risk Coloring**: Instant visual cues for critical projects.

### 4.2 WBS Manager
The project-level view integrates a **Forensics Widget** in the header, allowing project managers to see the "Run-Rate" vs "Exhaustion Date" alongside the standard budget table.

---

## 5. Security & Isolation
- **Tenant Isolation**: All forensics and report cache keys are strictly scoped to the `tenant_id`.
- **RBAC**: Access to forensic exports and sensitive burn-rate data is restricted to `CEO`, `PROJECT_MANAGER`, and `ADMIN` roles.

---
*Precision. Resilience. Intelligence. SentinelFi.*
