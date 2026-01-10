# Consolidated Codebase Findings v2.0: Deep-Dive & Reality Check

**Date:** January 10, 2026
**Version:** 2.0 (Consolidated)
**Status:** **CRITICAL ARCHITECTURAL FLAWS DETECTED**

---

## Executive Summary

This report merges previous high-level findings with a deep technical audit of the SentinelFi codebase.
**Crucial Update:** While previous reports identified the multi-tenancy implementation as "fragile," our deep code audit confirms it is **functionally broken**. The current middleware establishes a secure connection context but fails to propagate it to the application layers. Consequently, the application currently defaults to the public schema for all operations, ensuring data leakage or application failure in a real multi-tenant scenario.

**The "Foundational Architecture" phase is NOT complete.** It requires immediate, high-priority remediation.

---

## 1. Critical Backend Findings (The "Red" Flags)

### 1.1. Broken Multi-Tenancy Architecture (Severity: CRITICAL)
*   **Previous Finding:** "Multi-Tenancy Implementation Gap... reliance on `req.schema_name` is fragile."
*   **Deep-Dive Confirmation:** The `TenancyMiddleware` creates a `QueryRunner` and sets the `search_path` correctly, but this runner is **never shared** with the Services or Repositories.
*   **Technical Reality:** When `ProjectsService` calls `this.projectRepository.find()`, it uses the standard, global connection pool—completely bypassing the middleware's isolated context.
*   **Impact:** **Zero Data Isolation.** All tenants query the same public table space (or crash if tables don't exist in public).
*   **Correction Required:** We must implement a **Context Propagation** mechanism (e.g., `nestjs-cls`) to force all database operations within a request to use the transaction/connection set up by the middleware.

### 1.2. Missing Schema Automations (Severity: HIGH)
*   **Finding:** The `TenantService` creates a new schema using `CREATE SCHEMA`, but **does not run TypeORM migrations** on that new schema.
*   **Impact:** New tenants are created with empty schemas (no tables). The application will crash with "relation does not exist" errors immediately upon access.
*   **Correction Required:** Programmatic migration execution must be part of the "Create Tenant" transaction.

### 1.3. Operational Budgeting "Ghost Module" (Severity: HIGH)
*   **Finding:** The backend has an `OperationalBudgetEntity` but lacks:
    *   `OperationalExpenseEntity` (to store actual spending).
    *   Service logic to log usage.
    *   Logic to update `actual_spent`.
*   **Impact:** The module is effectively strictly for "viewing a static budget," not for managing one.

---

## 2. Frontend Findings (User Journey Blockers)

### 2.1. The "Dead End" Projects Page
*   **Finding:** `frontend/pages/projects.tsx` displays projects (or would, if the backend worked) but offers **no way to create one**.
*   **Impact:** Users cannot populate the system with data.
*   **Correction Required:** A "New Project" Wizard is mandatory for Phase 2.

### 2.2. Missing Operational UI
*   **Finding:** There are no pages to view details of an operational budget or log expenses against it.

### 2.3. Security & UX Gaps
*   **Role Enforcement:** Client-side role checks are loose. UI elements for SuperAdmins are visible to regular users (though likely non-functional due to backend guards).
*   **State Management:** Heavy reliance on page reloads.

---

## 3. General & Infrastructure

### 3.1. Testing Void
*   **Confirmed:** Zero automated tests exist.
*   **Risk:** Refactoring the broken tenancy middleware acts as "open-heart surgery." Without tests, verifying the fix is high-risk.

### 3.2. Documentation
*   **Status:** Improved with these reports, but API documentation (Swagger) is missing.

---

## 4. Conclusion
We cannot proceed to "Feature Building" (Phase 3 of the original PRD). We must regress to **Phase 1** to fix the invisible but fatal flaws in the data access layer.
